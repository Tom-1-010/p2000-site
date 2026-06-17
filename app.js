const bottomNavLinks = [...document.querySelectorAll('.bottom-nav a')];
const sections = [...document.querySelectorAll('main section[id], .feature-card[id]')];

function setActiveBottomItem() {
  const scrollPosition = window.scrollY + window.innerHeight * 0.35;
  let activeId = 'mijnbuurt';

  sections.forEach((section) => {
    if (section.offsetTop <= scrollPosition) {
      activeId = section.id || activeId;
    }
  });

  bottomNavLinks.forEach((link) => {
    const targetId = link.getAttribute('href')?.replace('#', '');
    link.classList.toggle('active', targetId === activeId);
  });
}

bottomNavLinks.forEach((link) => {
  link.addEventListener('click', () => {
    bottomNavLinks.forEach((item) => item.classList.remove('active'));
    link.classList.add('active');
  });
});

window.addEventListener('scroll', setActiveBottomItem, { passive: true });
window.addEventListener('load', setActiveBottomItem);
setActiveBottomItem();
