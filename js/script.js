/*
  Creative Tech Portfolio — zero-dependency interactive 3D renderer.
  Runs locally or on GitHub Pages without a build step or WebGL libraries.
*/
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let motionOff = prefersReduced.matches;
  const motionSwitch = $('.motion-switch');
  const motionLabel = $('.motion-label');

  function setMotionPaused(paused) {
    motionOff = paused;
    document.body.classList.toggle('motion-paused', paused);
    motionSwitch?.setAttribute('aria-pressed', String(paused));
    motionSwitch?.setAttribute('aria-label', paused ? 'Resume animations' : 'Pause animations');
    if (motionLabel) motionLabel.textContent = paused ? 'Motion off' : 'Motion on';
    if (paused) $$('.reveal').forEach(el => el.classList.add('is-visible'));
    if (orbitalScene) orbitalScene.setReducedMotion(paused);
  }

  // Navbar and mobile menu.
  const header = $('#site-header');
  const menuToggle = $('.menu-toggle');
  const mobileNav = $('#mobile-nav');
  const closeMenu = () => {
    if (!mobileNav || !menuToggle) return;
    mobileNav.hidden = true;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
    header.classList.remove('nav-open');
    document.body.classList.remove('menu-open');
  };
  menuToggle?.addEventListener('click', () => {
    const shouldOpen = menuToggle.getAttribute('aria-expanded') !== 'true';
    mobileNav.hidden = !shouldOpen;
    menuToggle.setAttribute('aria-expanded', String(shouldOpen));
    menuToggle.setAttribute('aria-label', shouldOpen ? 'Close navigation' : 'Open navigation');
    header.classList.toggle('nav-open', shouldOpen);
    document.body.classList.toggle('menu-open', shouldOpen);
  });
  $$('#mobile-nav a').forEach(a => a.addEventListener('click', closeMenu));
  window.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  window.addEventListener('resize', () => { if (window.innerWidth > 920) closeMenu(); });

  // Reading indicator + section highlighting (passive, one RAF per frame).
  const progressBar = $('.scroll-progress');
  let scrollTick = false;
  function updateScroll() {
    const total = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    if (progressBar) progressBar.style.width = `${Math.min(100, (window.scrollY / total) * 100)}%`;
    header?.classList.toggle('is-scrolled', window.scrollY > 25);
    scrollTick = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollTick) { scrollTick = true; requestAnimationFrame(updateScroll); }
  }, { passive: true });
  updateScroll();
  const sections = $$('#work,#about,#expertise,#experience');
  if ('IntersectionObserver' in window) {
    const sectionIO = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        $$('.desktop-nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`));
      }
    }), { rootMargin: '-30% 0px -55% 0px' });
    sections.forEach(s => sectionIO.observe(s));
  }
  $('#year').textContent = new Date().getFullYear();

  // Scroll reveals; content remains visible when JS / observer is unavailable.
  if (!motionOff && 'IntersectionObserver' in window) {
    document.body.classList.add('js-reveal');
    const revealObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); obs.unobserve(entry.target); }
      });
    }, { threshold: .08, rootMargin: '0px 0px -34px 0px' });
    $$('.reveal').forEach((el, i) => {
      el.style.setProperty('--reveal-delay', `${Math.min(i % 3, 2) * 55}ms`);
      revealObserver.observe(el);
    });
  }

  // Optional pointer response: subtle highlights, not motion-heavy scrolling.
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (finePointer) {
    const glow = $('.cursor-glow');
    window.addEventListener('pointermove', (event) => {
      if (motionOff) return;
      document.body.classList.add('has-pointer');
      if (glow) { glow.style.left = `${event.clientX}px`; glow.style.top = `${event.clientY}px`; }
    }, { passive: true });
    $$('.tilt-surface').forEach(card => {
      let raf = 0;
      card.addEventListener('pointermove', event => {
        if (motionOff) return;
        const rect = card.getBoundingClientRect();
        const nx = (event.clientX - rect.left) / rect.width;
        const ny = (event.clientY - rect.top) / rect.height;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          card.style.setProperty('--light-x', `${nx * 100}%`);
          card.style.setProperty('--light-y', `${ny * 100}%`);
          card.style.transform = `perspective(1400px) rotateX(${(0.5 - ny) * 2.7}deg) rotateY(${(nx - 0.5) * 2.7}deg) translateY(-3px)`;
          card.classList.add('is-tilting');
        });
      }, { passive: true });
      card.addEventListener('pointerleave', () => {
        cancelAnimationFrame(raf);card.style.transform = '';card.classList.remove('is-tilting');
      });
    });
  }

  /* 3D rendered wireframe globe + animated equatorial / oblique orbital rings.
     x,y,z are real 3D coordinates projected by perspective into canvas 2D.
     Pointer dragging changes rotation. All rendering is self-contained/offline. */
  class OrbitalScene {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: true });
      if (!this.ctx) return;
      this.host = canvas.parentElement;
      this.width = this.height = 1;
      this.pitch = -0.25;
      this.yaw = -0.25;
      this.velocityX = this.velocityY = 0;
      this.dragging = false;
      this.pointerId = null;
      this.lastX = this.lastY = 0;
      this.paused = false;
      this.visible = true;
      this.dpr = 1;
      this.lastFrame = 0;
      this.time = 0;
      this.stars = Array.from({ length: 95 }, (_, i) => ({
        x: (Math.sin(i * 74.23 + 12) * 2314.1 % 1 + 1) % 1,
        y: (Math.sin(i * 19.72 + 8) * 4231.4 % 1 + 1) % 1,
        r: .35 + ((i * 17) % 10) / 16,
        a: .16 + ((i * 23) % 13) / 48
      }));
      this.attach();
      this.resize();
      requestAnimationFrame(t => this.frame(t));
    }
    setReducedMotion(value) { this.paused = value; this.render(); }
    attach() {
      this.resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(() => this.resize()) : null;
      this.resizeObserver?.observe(this.canvas);
      if (!this.resizeObserver) window.addEventListener('resize', () => this.resize());
      this.host.addEventListener('pointerdown', e => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        this.dragging = true;this.pointerId = e.pointerId;this.lastX = e.clientX;this.lastY = e.clientY;
        this.host.classList.add('dragging');
        this.host.setPointerCapture?.(e.pointerId);
      });
      this.host.addEventListener('pointermove', e => {
        if (!this.dragging || this.pointerId !== e.pointerId) return;
        const dx = e.clientX - this.lastX;
        const dy = e.clientY - this.lastY;
        this.yaw += dx * .007;
        this.pitch = Math.min(1.15, Math.max(-1.15, this.pitch + dy * .006));
        this.velocityX = dx * .0008;this.velocityY = dy * .0007;
        this.lastX = e.clientX;this.lastY = e.clientY;
        if (e.pointerType === 'touch' && Math.abs(dx) + Math.abs(dy) > 2) this.host.style.touchAction = 'none';
        if (this.paused) this.render();
      });
      const release = e => {
        if (this.pointerId !== e.pointerId) return;
        this.dragging = false;this.pointerId = null;
        this.host.classList.remove('dragging');this.host.style.touchAction = 'pan-y';
        try { this.host.releasePointerCapture?.(e.pointerId); } catch (_) { /* capture may have ended */ }
      };
      this.host.addEventListener('pointerup', release);
      this.host.addEventListener('pointercancel', release);
      if ('IntersectionObserver' in window) {
        const obs = new IntersectionObserver(entries => { this.visible = entries[0]?.isIntersecting ?? true; }, { threshold: 0 });
        obs.observe(this.canvas);
      }
    }
    resize() {
      if (!this.ctx) return;
      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      this.width = rect.width;this.height = rect.height;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(rect.width * this.dpr);
      this.canvas.height = Math.round(rect.height * this.dpr);
      this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
      this.render();
    }
    rotate(x,y,z) {
      const cy = Math.cos(this.yaw),sy = Math.sin(this.yaw);
      let rx = x*cy + z*sy, rz = -x*sy + z*cy;
      const cp = Math.cos(this.pitch),sp = Math.sin(this.pitch);
      return [rx, y*cp - rz*sp, y*sp + rz*cp];
    }
    project(x,y,z) {
      const v = this.rotate(x,y,z);
      const focal = 3.4, perspective = focal / (focal - v[2]);
      const unit = Math.min(this.width,this.height) * .32;
      return {x:this.width*.51 + v[0]*unit*perspective,y:this.height*.49 + v[1]*unit*perspective,z:v[2],s:perspective};
    }
    line(points,stroke,width=1) {
      if (!points.length) return;
      const ctx=this.ctx;ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
      for(let i=1;i<points.length;i++) ctx.lineTo(points[i].x,points[i].y);
      ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();
    }
    globe() {
      const ctx=this.ctx,r=0.93;
      // Back hemisphere drawn first, then lit front-facing arcs.
      for(let layer=0;layer<2;layer++) {
        // Latitudes: naturally perspective-projected 3D rings.
        for(let j=-6;j<=6;j++) {
          const latitude=j/7*Math.PI/2;
          let partial=[];
          for(let k=0;k<=144;k++) {
            const a=k/144*Math.PI*2;
            const p=this.project(r*Math.cos(latitude)*Math.cos(a),r*Math.sin(latitude),r*Math.cos(latitude)*Math.sin(a));
            const front=p.z>=0;
            if ((layer===1)===front) partial.push(p);
            else {if(partial.length>1)this.line(partial,layer?'rgba(175,248,196,.31)':'rgba(97,166,140,.13)',layer?0.95:0.7);partial=[];}
          }
          if(partial.length>1)this.line(partial,layer?'rgba(175,248,196,.31)':'rgba(97,166,140,.13)',layer?0.95:0.7);
        }
        // Meridians.
        for(let j=0;j<16;j++) {
          const a=j/16*Math.PI*2;
          let partial=[];
          for(let k=0;k<=90;k++) {
            const lat=-Math.PI/2 + k/90*Math.PI;
            const p=this.project(r*Math.cos(lat)*Math.cos(a),r*Math.sin(lat),r*Math.cos(lat)*Math.sin(a));
            if ((layer===1)===(p.z>=0))partial.push(p);
            else {if(partial.length>1)this.line(partial,layer?'rgba(171,247,190,.24)':'rgba(99,169,155,.1)',layer?0.85:0.55);partial=[];}
          }
          if(partial.length>1)this.line(partial,layer?'rgba(171,247,190,.24)':'rgba(99,169,155,.1)',layer?0.85:0.55);
        }
      }
      // Bright sparse constellations across sphere's outward facing surface.
      for(let i=0;i<90;i++) {
        const u=(i+.5)/90;
        const theta=i*2.399963229728653;
        const latitude=Math.asin(2*u-1),rad=Math.cos(latitude);
        const p=this.project(r*rad*Math.cos(theta),r*Math.sin(latitude),r*rad*Math.sin(theta));
        if(p.z<-.12)continue;
        const size=(i%9===0?2.1:1)*p.s;
        ctx.beginPath();ctx.arc(p.x,p.y,size,0,Math.PI*2);
        ctx.fillStyle=i%7===0?'rgba(222,255,228,.94)':'rgba(178,242,192,.6)';ctx.fill();
      }
      // Glassy center illumination gives a clear silhouette behind the mesh.
      const center=this.project(0,0,0);
      const glow=ctx.createRadialGradient(center.x,center.y,6,center.x,center.y,Math.min(this.width,this.height)*.32);
      glow.addColorStop(0,'rgba(169,243,190,.085)');glow.addColorStop(.65,'rgba(100,162,129,.025)');glow.addColorStop(1,'rgba(100,162,129,0)');
      ctx.globalCompositeOperation='destination-over';ctx.fillStyle=glow;ctx.beginPath();ctx.arc(center.x,center.y,Math.min(this.width,this.height)*.34,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='source-over';
    }
    orbit(radius,tilt,phase,color,thickness=1.25) {
      const ctx=this.ctx;const pts=[];
      for(let i=0;i<=160;i++) {
        const a=i/160*Math.PI*2+phase;
        const x=radius*Math.cos(a), y=radius*Math.sin(a)*Math.cos(tilt),z=radius*Math.sin(a)*Math.sin(tilt);
        pts.push(this.project(x,y,z));
      }
      this.line(pts,color,thickness);
      return pts;
    }
    render() {
      const ctx=this.ctx;if(!ctx)return;
      ctx.clearRect(0,0,this.width,this.height);
      // Peripheral star field and small dust motes.
      for(const st of this.stars){ctx.beginPath();ctx.arc(st.x*this.width,st.y*this.height,st.r,0,Math.PI*2);ctx.fillStyle=`rgba(211,245,217,${st.a})`;ctx.fill();}
      const cx=this.width*.51,cy=this.height*.49;
      const haze=ctx.createRadialGradient(cx,cy,15,cx,cy,Math.min(this.width,this.height)*.48);
      haze.addColorStop(0,'rgba(95,182,130,.16)');haze.addColorStop(.65,'rgba(67,122,132,.045)');haze.addColorStop(1,'rgba(70,142,116,0)');
      ctx.fillStyle=haze;ctx.fillRect(0,0,this.width,this.height);
      // Three inclined rings orbit the sphere, with subtle perspective.
      const orbit1=this.orbit(1.36,.27,this.time*.085,'rgba(145,233,185,.32)',1.1);
      const orbit2=this.orbit(1.27,-1.04,this.time*.036,'rgba(164,152,250,.36)',1.1);
      const orbit3=this.orbit(1.12,.91,-this.time*.065,'rgba(162,237,180,.18)',.9);
      this.globe();
      // Satellites travelling on the rings: projected from their true 3D orbit positions.
      [ [orbit1,.62,'#bafbc5'],[orbit2,.25,'#c6baff'],[orbit3,.89,'#a4ecce']].forEach(([ring,pos,color],i)=>{
        const idx=Math.floor(((pos+this.time*(i%2?-.035:.052))%1+1)%1*160);
        const p=ring[idx];if(!p)return;
        ctx.shadowColor=color;ctx.shadowBlur=18;ctx.beginPath();ctx.arc(p.x,p.y,i===0?3.8:2.7,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.shadowBlur=0;
      });
      // Technical corner dots.
      ctx.fillStyle='rgba(183,254,191,.64)';
      [[.18,.22],[.82,.72],[.16,.8],[.86,.26]].forEach(([x,y])=>{ctx.fillRect(this.width*x-1,this.height*y-1,2,2)});
    }
    frame(ms) {
      if (!this.ctx) return;
      const dt=this.lastFrame ? Math.min((ms-this.lastFrame)/1000,.07) : 0;
      this.lastFrame=ms;
      if (!this.paused && this.visible && !document.hidden) {
        this.time+=dt;
        if (!this.dragging) {
          this.yaw+=dt*.16+this.velocityX;
          this.pitch+=this.velocityY;
          this.velocityX*=.94;this.velocityY*=.92;
        }
        this.render();
      }
      requestAnimationFrame(t=>this.frame(t));
    }
  }
  const canvas = $('#orb-canvas');
  const orbitalScene = canvas ? new OrbitalScene(canvas) : null;
  motionSwitch?.addEventListener('click', () => setMotionPaused(!motionOff));
  setMotionPaused(motionOff);
  prefersReduced.addEventListener?.('change', event => setMotionPaused(event.matches));
})();
