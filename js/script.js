// Scroll reveal animation
const observer = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("show");
                observer.unobserve(entry.target);
            }
        });
    },
    { threshold: 0.1 }
);

document
    .querySelectorAll(".section, .project, .skills article, .certs article, .exp")
    .forEach((element) => {
        element.classList.add("fade");
        observer.observe(element);
    });


// Subtle 3D mouse tilt for desktop
const tiltCards = document.querySelectorAll(".tilt-card, .project.featured");

if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    tiltCards.forEach((card) => {
        card.addEventListener("pointermove", (event) => {
            const rect = card.getBoundingClientRect();

            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            const rotateY = ((x / rect.width) - 0.5) * 5;
            const rotateX = ((y / rect.height) - 0.5) * -5;

            card.style.transform =
                `perspective(1000px) translateY(-4px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });

        card.addEventListener("pointerleave", () => {
            card.style.transform = "";
        });
    });
}


// Small parallax movement for the profile image
const profilePhoto = document.querySelector(".profile-photo img");

if (profilePhoto && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const profileCard = document.querySelector(".profile-card");

    profileCard?.addEventListener("pointermove", (event) => {
        const rect = profileCard.getBoundingClientRect();

        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;

        profilePhoto.style.transform =
            `translate(${x * 5}px, ${y * 5}px) scale(1.025)`;
    });

    profileCard?.addEventListener("pointerleave", () => {
        profilePhoto.style.transform = "";
    });
}


/* ===== EXTRA PORTFOLIO INTERACTIONS ===== */
document.addEventListener("DOMContentLoaded", () => {

    // Staggered reveal for cards
    const groups = [
        ".skills article",
        ".projects .project",
        ".certs article",
        ".experience .exp"
    ];

    groups.forEach(selector => {
        document.querySelectorAll(selector).forEach((item, index) => {
            item.style.setProperty("--reveal-delay", `${index * 70}ms`);
            item.classList.add("stagger-item");
        });
    });

    // Small pointer interaction on cards
    document.querySelectorAll(".project, .skills article, .certs article").forEach(card => {
        card.addEventListener("pointermove", (e) => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width - 0.5) * 4;
            const y = ((e.clientY - rect.top) / rect.height - 0.5) * -4;
            card.style.setProperty("--mx", `${x}deg`);
            card.style.setProperty("--my", `${y}deg`);
        });

        card.addEventListener("pointerleave", () => {
            card.style.setProperty("--mx", "0deg");
            card.style.setProperty("--my", "0deg");
        });
    });

    // Scroll progress
    const progress = document.createElement("div");
    progress.className = "scroll-progress";
    document.body.appendChild(progress);

    const updateProgress = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const value = max > 0 ? (window.scrollY / max) * 100 : 0;
        progress.style.width = `${value}%`;
    };

    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();
});
