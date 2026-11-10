
(() => {
    const API = "https://api.tcgdex.net/v2/en/cards";
    const TAILLE_PAGE = 24;

    const recherche = document.getElementById("recherche");
    const boutonRecherche = document.getElementById("bouton-recherche");
    const boutonEnvies = document.getElementById("bouton-envies");
    const boutonPlus = document.getElementById("bouton-plus");
    const grille = document.getElementById("grille-cartes");
    const message = document.getElementById("message");
    const titre = document.getElementById("titre-resultats");
    const compteur = document.getElementById("compteur-resultats");
    const compteurEnvies = document.getElementById("compteur-envies");
    const boutonPartager = document.getElementById("bouton-partager");

    let page = 1;
    let cartesChargees = [];
    let envies = [];
    let chargement = false;
    let afficherEnvies = false;
    let rechercheActuelle = "";
    let modePartage = false;

    try {
        envies = JSON.parse(localStorage.getItem("pokemon-envies") || "[]");
        if (!Array.isArray(envies)) envies = [];
    } catch {
        envies = [];
    }

    function imageCarte(carte) {
        return carte.image ? `${carte.image}/low.webp` : "";
    }

    function sauvegarderEnvies() {
        localStorage.setItem("pokemon-envies", JSON.stringify(envies));
        compteurEnvies.textContent = envies.length;
    }

    function afficherCartes(cartes) {
        grille.replaceChildren();
        message.hidden = cartes.length > 0;

        if (!cartes.length) {
            message.textContent = afficherEnvies
                ? "Ta liste d'envies est vide."
                : "Aucune carte trouvée.";
            return;
        }

        cartes.forEach(carte => {
            const article = document.createElement("article");
            article.className = "carte-pokemon";

            const image = document.createElement("img");
            image.src = imageCarte(carte);
            image.alt = carte.name;
            image.loading = "lazy";
            image.onerror = () => {
                image.alt = "Image indisponible";
                image.removeAttribute("src");
            };

            const contenu = document.createElement("div");
            contenu.className = "infos-carte";

            const nom = document.createElement("h3");
            nom.textContent = carte.name;

            const numero = document.createElement("p");
            numero.className = "details-carte";
            numero.textContent = `N° ${carte.localId || "?"}`;

            const bouton = document.createElement("button");
            bouton.type = "button";
            bouton.hidden = modePartage;
            bouton.className = "bouton-envie";

            function actualiserBouton() {
                const ajoutee = envies.some(item => item.id === carte.id);
                bouton.textContent = ajoutee
                    ? "Dans ma liste"
                    : "Ajouter aux envies";
                bouton.classList.toggle("est-ajoutee", ajoutee);
            }

            bouton.addEventListener("click", () => {
                const index = envies.findIndex(item => item.id === carte.id);

                if (index >= 0) {
                    envies.splice(index, 1);
                } else {
                    envies.push(carte);
                }

                sauvegarderEnvies();
                actualiserBouton();

                if (afficherEnvies) {
                    afficherCartes(envies);
                    compteur.textContent = `${envies.length} cartes dans ma liste`;
                }
            });

            actualiserBouton();
            contenu.append(nom, numero, bouton);
            article.append(image, contenu);
            grille.append(article);
        });
    }

    async function chargerCartes(nouvelleRecherche = false) {
        if (chargement) return;

        if (nouvelleRecherche) {
            page = 1;
            cartesChargees = [];
            rechercheActuelle = recherche.value.trim();
        }

        afficherEnvies = false;
        boutonEnvies.setAttribute("aria-pressed", "false");
        titre.textContent = rechercheActuelle
            ? `Résultats pour « ${rechercheActuelle} »`
            : "Cartes Pokémon en français";

        chargement = true;
        boutonRecherche.disabled = true;
        boutonPlus.disabled = true;
        message.hidden = false;
        message.textContent = "Chargement des cartes...";
        compteur.textContent = "Chargement...";

        try {
            const params = new URLSearchParams({
                "pagination:page": page,
                "pagination:itemsPerPage": TAILLE_PAGE
            });

            if (rechercheActuelle) {
                params.set("name", rechercheActuelle);
            }

            const reponse = await fetch(`${API}?${params}`);

            if (!reponse.ok) throw new Error("Erreur API");

            const cartes = await reponse.json();

            cartesChargees = nouvelleRecherche
                ? cartes
                : cartesChargees.concat(cartes);

            afficherCartes(cartesChargees);
            compteur.textContent = `${cartesChargees.length} cartes affichées`;

            boutonPlus.hidden = cartes.length < TAILLE_PAGE;
        } catch (erreur) {
            message.hidden = false;
            message.textContent =
                "Impossible de charger les cartes. Vérifie ta connexion Internet.";
            boutonPlus.hidden = true;
        } finally {
            chargement = false;
            boutonRecherche.disabled = false;
            boutonPlus.disabled = false;
        }
    }

    boutonRecherche.addEventListener("click", () => chargerCartes(true));

    recherche.addEventListener("keydown", event => {
        if (event.key === "Enter") chargerCartes(true);
    });

    boutonPlus.addEventListener("click", () => {
        if (!chargement) {
            page++;
            chargerCartes();
        }
    });

    boutonEnvies.addEventListener("click", () => {
        afficherEnvies = !afficherEnvies;

        boutonEnvies.setAttribute("aria-pressed", String(afficherEnvies));
        titre.textContent = afficherEnvies
            ? "Ma liste d'envies"
            : "Cartes Pokémon en français";

        compteur.textContent = afficherEnvies
            ? `${envies.length} cartes dans ma liste`
            : `${cartesChargees.length} cartes affichées`;

        boutonPlus.hidden = afficherEnvies;
        afficherCartes(afficherEnvies ? envies : cartesChargees);
    });
    
    async function chargerListePartagee(ids) {
        modePartage = true;

        recherche.hidden = true;
        boutonRecherche.hidden = true;
        boutonEnvies.hidden = true;
        boutonPlus.hidden = true;
        boutonPartager.hidden = true;

        titre.textContent = "Liste Pokémon partagée";
        message.hidden = false;
        message.textContent = "Chargement de la liste...";
        compteur.textContent = "Chargement...";

        try {
            const resultats = await Promise.all(
                ids.map(async id => {
                    const reponse = await fetch(
                        `${API}/${encodeURIComponent(id)}`
                    );

                    if (!reponse.ok) return null;
                    return reponse.json();
                })
            );

            const cartes = resultats.filter(Boolean);

            afficherCartes(cartes);
            compteur.textContent =
                `${cartes.length} cartes partagées`;

            if (cartes.length === 0) {
                message.textContent =
                    "Aucune carte n'a pu être chargée.";
            }
        } catch (erreur) {
            message.hidden = false;
            message.textContent =
                "Impossible de charger la liste partagée. Vérifie ta connexion.";
            compteur.textContent = "";
        }
    }

    boutonPartager.addEventListener("click", async () => {
        const ids = envies
            .map(carte => carte.id)
            .filter(Boolean);

        if (ids.length === 0) {
            alert("Ajoute d'abord des cartes à ta liste d'envies !");
            return;
        }

        const url =
            `${window.location.origin}${window.location.pathname}` +
            `#partage=${encodeURIComponent(ids.join(","))}`;

        try {
            await navigator.clipboard.writeText(url);
            alert("Lien copié ! Tu peux l'envoyer à ton ami.");
        } catch (erreur) {
            window.prompt("Copie ce lien pour le partager :", url);
        }
    });

    compteurEnvies.textContent = envies.length;

    const parametresPartage = new URLSearchParams(
        window.location.hash.slice(1)
    );

    const idsPartage = (
        parametresPartage.get("partage") || ""
    ).split(",").filter(Boolean);

    if (idsPartage.length > 0) {
        chargerListePartagee(idsPartage);
    } else {
        chargerCartes(true);
    }

})();
