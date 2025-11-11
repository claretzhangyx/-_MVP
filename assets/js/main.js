// 全站通用交互脚本
document.addEventListener('DOMContentLoaded', () => {
  highlightActiveNav();
  setupBackToTop();
  setupFadeInObserver();
  setupSmoothAnchorScroll();
  setupContactModal();
});

function highlightActiveNav() {
  const navLinks = document.querySelectorAll('.nav-links a[data-page]');
  const currentPage = document.body.dataset.page;
  navLinks.forEach((link) => {
    if (link.dataset.page === currentPage) {
      link.classList.add('active');
    }
  });
}

function setupBackToTop() {
  const backToTop = document.querySelector('.back-to-top');
  if (!backToTop) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 280) {
      backToTop.classList.add('show');
    } else {
      backToTop.classList.remove('show');
    }
  });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function setupFadeInObserver() {
  const elements = document.querySelectorAll('.fade-in');
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  elements.forEach((el) => observer.observe(el));
}

function setupSmoothAnchorScroll() {
  const navLinks = document.querySelectorAll('a[href^="#"]');
  navLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;
      const target = document.querySelector(targetId);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

function setupContactModal() {
  const modal = document.querySelector('#contactModal');
  if (!modal) return;
  const closeBtn = modal.querySelector('.contact-modal__close');
  const contactLinks = document.querySelectorAll('.contact-link');

  const openModal = (event) => {
    event.preventDefault();
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
  };

  const closeModal = () => {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
  };

  contactLinks.forEach((link) => link.addEventListener('click', openModal));
  closeBtn && closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('show')) {
      closeModal();
    }
  });
}

