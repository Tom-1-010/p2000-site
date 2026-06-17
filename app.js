const currentPage = document.body.dataset.page;
const bottomNavLinks = [...document.querySelectorAll('.bottom-nav a')];

bottomNavLinks.forEach((link) => {
  link.classList.toggle('active', link.dataset.page === currentPage);
});
