// Inicialização dos ícones Lucide
document.addEventListener('DOMContentLoaded', function() {
    lucide.createIcons();

    // Menu Mobile Toggle
    const menuBtn = document.getElementById('menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (menuBtn && mobileMenu) {
        menuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Fechar menu ao clicar em um link
    const navLinks = document.querySelectorAll('#mobile-menu a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
        });
    });

    // Simulação de envio de formulário
    const contactForm = document.getElementById('contact-form');
    const statusMessage = document.getElementById('status-message');

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Simulação de processamento
            const submitBtn = contactForm.querySelector('button');
            submitBtn.innerText = 'Enviando...';
            submitBtn.disabled = true;

            setTimeout(() => {
                statusMessage.innerText = 'Mensagem enviada com sucesso! Entrarei em contato em breve.';
                statusMessage.className = 'mb-4 p-4 rounded-lg bg-green-500 text-white';
                statusMessage.classList.remove('hidden');
                
                contactForm.reset();
                submitBtn.innerText = 'Enviar Mensagem';
                submitBtn.disabled = false;

                // Esconder mensagem após 5 segundos
                setTimeout(() => {
                    statusMessage.classList.add('hidden');
                }, 5000);
            }, 1500);
        });
    }

    // Smooth Scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId !== '#') {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
});