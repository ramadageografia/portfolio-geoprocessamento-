// assets/js/config.js
const CONFIG = {
    // Seus dados pessoais
    PERSONAL: {
        name: "Seu Nome",
        email: "seu.email@exemplo.com",
        phone: "+55 (11) 99999-9999",
        location: "São Paulo, Brasil",
        title: "Especialista em Geoprocessamento",
        bio: "Transformando dados espaciais em soluções inteligentes..."
    },
    
    // Seus links
    LINKS: {
        colab: "https://colab.research.google.com/drive/1pKJIoHXHiKybXH3pjODGg6IkornrvJua",
        myMaps: "https://www.google.com/maps/d/u/0/edit?hl=pt-BR&mid=1adej1ZKSiAOyUe4Uu9jPBV6P6DalfQk",
        github: "https://github.com/seuusuario",
        linkedin: "https://linkedin.com/in/seuusuario",
        researchgate: "https://researchgate.net/profile/seuusuario"
    },
    
    // Seus projetos
    PROJECTS: [
        {
            id: 1,
            title: "Mapa de Uso do Solo",
            category: "cartografia",
            technologies: ["QGIS", "Python", "Sentinel-2"],
            colabLink: "#",
            myMapsLink: "#",
            description: "Classificação supervisionada..."
        }
        // Adicione seus projetos aqui
    ]
};

// Exportar para uso global
window.CONFIG = CONFIG;