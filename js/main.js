// main.js - bascule de navigation et accessibilité
(function(){
  // Helpers de requête simples pour garder le code concis
  function qs(sel, ctx){ return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx){ return Array.from((ctx || document).querySelectorAll(sel)); }

  // trapFocus : maintient le focus clavier à l'intérieur d'un conteneur (utilisé pour les menus/modals)
  // - container : élément DOM dans lequel piéger le focus
  function trapFocus(container){
    if(!container) return;
    const focusable = container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if(!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    function handleKey(e){
      if(e.key !== 'Tab') return;
      if(e.shiftKey){
        if(document.activeElement === first){
          e.preventDefault();
          last.focus();
        }
      } else {
        if(document.activeElement === last){
          e.preventDefault();
          first.focus();
        }
      }
    }

    container.__focusHandler = handleKey;
    document.addEventListener('keydown', handleKey);
    // place le focus sur le premier élément du conteneur
    first.focus();
  }

  // releaseFocus : supprime le piège et restaure éventuellement le focus vers un élément précédent
  function releaseFocus(container, restore){
    if(container && container.__focusHandler) document.removeEventListener('keydown', container.__focusHandler);
    if(restore && typeof restore.focus === 'function') restore.focus();
  }

  // initEventFilters : branche les boutons de filtre simples qui affichent/masquent les .event-card
  // Les boutons doivent posséder un attribut data-type (ex. data-type="anime")
  function initEventFilters(){
    const filterBtns = qsa('.filter-btn');
    if(!filterBtns.length) return;
    const eventCards = qsa('.event-card');

  filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

  // afficher/masquer les cartes en fonction du data-type du bouton cliqué
        const type = btn.dataset.type;
        eventCards.forEach(card => {
          if(type === 'all' || card.dataset.type === type) {
            card.classList.remove('hide');
          } else {
            card.classList.add('hide');
          }
        });
      });
    });
  }

  function init(){
  // récupération des nœuds DOM importants pour la navigation et le header
  const btn = qs('#nav-toggle');
  const nav = qs('#site-navigation');
  const header = qs('header');
    let lastFocused = null;

    if(!btn || !nav || !header) {
      // initialise quand même les filtres si présents sur les pages sans nav
      initEventFilters();
      return;
    }

    // initialisation
    btn.setAttribute('aria-expanded', 'false');
    nav.setAttribute('aria-hidden', 'true');

    // initialisation

  // openMenu : ouvre la navigation mobile et piège le focus à l'intérieur
  function openMenu(){
      lastFocused = document.activeElement;
      header.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      nav.setAttribute('aria-hidden', 'false');
      btn.innerHTML = '<i class="fa fa-times" aria-hidden="true"></i>';
      trapFocus(nav);
    }
  // closeMenu : ferme la navigation mobile et restaure le focus
  function closeMenu(){
      header.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      nav.setAttribute('aria-hidden', 'true');
      btn.innerHTML = '<i class="fa fa-bars" aria-hidden="true"></i>';
      releaseFocus(nav, lastFocused);
      lastFocused = null;
    }

    // protect against the document-level click listener closing the menu immediately
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      if(expanded) closeMenu(); else {
        openMenu();
        // briefly mark header to ignore the next document click
        header.classList.add('menu-opening');
        setTimeout(()=> header.classList.remove('menu-opening'), 250);
      }
    });

  // lorsque un lien de nav est cliqué, fermer le menu mobile (utile sur petits écrans)
  qsa('nav a').forEach(a => a.addEventListener('click', closeMenu));

    // ferme le menu à la touche Échap (global)
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape') closeMenu();
    });

    // ferme si clic en dehors du header quand le menu est ouvert
    document.addEventListener('click', function(e){
      if(!header.classList.contains('open')) return;
      // if we are in the brief opening window, ignore this click
      if(header.classList.contains('menu-opening')) return;
      if(header.contains(e.target)) return;
      closeMenu();
    });

  // brancher les filtres d'événements (si les boutons existent sur la page)
  initEventFilters();

  // Configuration de la lightbox : éléments utilisés pour afficher une image agrandie
  const gallery = qs('#gallery');
  const lightbox = qs('#lightbox');
  const lbImg = qs('#lb-img');
  const lbClose = qs('#lb-close');
  const lbContent = qs('.lightbox-content');
  const lbBackdrop = qs('#lb-backdrop');

  // openLightbox : affiche l'URL d'image fournie dans la modal
  function openLightbox(src, alt){
      if(!lightbox) return;
      lbImg.src = src;
      lbImg.alt = alt || '';
      lightbox.setAttribute('aria-hidden','false');
      if(lbBackdrop) lbBackdrop.classList.add('visible');
      if(lbContent) lbContent.classList.add('visible');
    }
  // closeLightbox : masque la modal et vide le src de l'image
  function closeLightbox(){
      if(!lightbox) return;
      lightbox.setAttribute('aria-hidden','true');
      if(lbBackdrop) lbBackdrop.classList.remove('visible');
      if(lbContent) lbContent.classList.remove('visible');
      lbImg.src = '';
    }

    // Track current gallery index for prev/next
    let galleryImages = Array.from(document.querySelectorAll('.gallery img'));
    let currentIndex = -1;

  // openLightboxAt : ouvre la lightbox pour l'image de la galerie à l'index fourni
  function openLightboxAt(index) {
      const img = galleryImages[index];
      if (!img) return;
      const full = img.dataset.full || img.src;
      currentIndex = index;
      openLightbox(full, img.alt || '');
    }

  // showPrev / showNext : navigue dans galleryImages et met à jour l'image de la modal
  function showPrev() {
      if (galleryImages.length === 0) return;
      currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
      const img = galleryImages[currentIndex];
      lbImg.src = img.dataset.full || img.src;
      lbImg.alt = img.alt || '';
    }

  function showNext() {
      if (galleryImages.length === 0) return;
      currentIndex = (currentIndex + 1) % galleryImages.length;
      const img = galleryImages[currentIndex];
      lbImg.src = img.dataset.full || img.src;
      lbImg.alt = img.alt || '';
    }

  // Boutons Prev/Next dans le DOM (peuvent être absents sur certaines pages)
  const lbPrev = document.getElementById('lb-prev');
  const lbNext = document.getElementById('lb-next');
  if (lbPrev) lbPrev.addEventListener('click', (e) => { e.stopPropagation(); showPrev(); });
  if (lbNext) lbNext.addEventListener('click', (e) => { e.stopPropagation(); showNext(); });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (lightbox.getAttribute('aria-hidden') === 'false') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          showPrev();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          showNext();
        }
      }
    });

  // Support tactile basique (swipe) à l'intérieur de la lightbox
    let touchStartX = 0;
    let touchEndX = 0;
    if(lbContent){
      lbContent.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });
      lbContent.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const dx = touchEndX - touchStartX;
        const threshold = 40; // px
        if (Math.abs(dx) > threshold) {
          if (dx > 0) showPrev(); else showNext();
        }
      });
    }
  // Attacher les gestionnaires de clic aux miniatures de la galerie
  galleryImages.forEach((gimg, idx) => {
      gimg.style.cursor = 'zoom-in';
      gimg.addEventListener('click', (e) => {
        e.preventDefault();
        openLightboxAt(idx);
      });
    });

  // mobile : tap-to-toggle pour .card (affiche le texte au premier tap, suit le lien au second)
    const cards = qsa('.card');
    if(cards.length){
      cards.forEach(card => {
        let touched = false;
        card.addEventListener('touchstart', function(e){
          if(!card.classList.contains('open')){
            // reveal on first touch
            card.classList.add('open');
            touched = true;
            // prevent the following click from activating links inside
            e.preventDefault();
            setTimeout(()=> touched = false, 500);
          }
        }, { passive: false });
      });
    }

    // gestionnaires globaux finaux : fermer avec ESC ou clic sur le backdrop
    if(lbClose) lbClose.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeLightbox(); });
    if(lbBackdrop) lbBackdrop.addEventListener('click', closeLightbox);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
