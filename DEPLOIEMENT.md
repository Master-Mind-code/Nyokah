# Déploiement de Nyokah avec Docker sur AWS EC2

## Architecture

```
Internet ──► :80  web (nginx)  ──► fichiers React compilés
                     │
                     └── /api/*  ──► api (Fastify, :4000) ──► db (PostgreSQL 16)
```

Trois conteneurs orchestrés par [docker-compose.yml](docker-compose.yml) :

| Service | Image | Rôle | Exposé ? |
|---|---|---|---|
| `web` | [Dockerfile](Dockerfile) (Vite → nginx) | Sert le frontend et relaie `/api` vers l'API | Oui, port 80 |
| `api` | [server/Dockerfile](server/Dockerfile) (Node 22) | API REST, applique les migrations Prisma au démarrage | Non (réseau interne) |
| `db` | `postgres:16-alpine` | Base de données, volume persistant `db-data` | Non (réseau interne) |

Le frontend et l'API partagent le même domaine. Il n'y a donc pas de CORS à gérer, et seul le port 80 est ouvert.

---

## 1. Tester en local

```bash
cp .env.production.example .env
# Renseigner POSTGRES_PASSWORD, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
# (openssl rand -base64 48), et PUBLIC_URL=http://localhost
docker compose up -d --build
docker compose exec api node dist/prisma/seed.js   # données de démonstration
```

Ouvrir http://localhost (ou le port choisi dans `HTTP_PORT`).

---

## 2. Créer l'instance EC2

Dans la console AWS, ouvrir **EC2 → Lancer une instance** :

1. **Nom** : `nyokah-server`
2. **AMI** : Ubuntu Server 24.04 LTS
3. **Type** : `t2.micro` ou `t3.micro` (éligibles à l'offre gratuite)
4. **Paire de clés** : en créer une (`nyokah-key`, format `.pem`) et la télécharger
5. **Paramètres réseau → groupe de sécurité**, avec les règles entrantes :
   - SSH (22) : source **Mon IP**
   - HTTP (80) : source **0.0.0.0/0** (n'importe où)
6. **Stockage** : 20 Go gp3
7. Lancer, puis noter l'**adresse IPv4 publique**.

> Facultatif mais recommandé : **EC2 → Adresses IP Elastic → Allouer**, puis l'associer à l'instance. Sans cela, l'IP publique change à chaque arrêt/redémarrage de l'instance.

## 3. Se connecter en SSH

Depuis PowerShell, dans le dossier contenant la clé :

```powershell
ssh -i nyokah-key.pem ubuntu@<IP_PUBLIQUE>
```

## 4. Préparer le serveur

```bash
# Docker + plugin compose
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
newgrp docker

# Swap de 2 Go : 1 Go de RAM ne suffit pas pour compiler le frontend
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 5. Récupérer le code et configurer

```bash
git clone https://github.com/Master-Mind-code/Nyokah.git
cd Nyokah
git checkout feat/backend-api-et-back-office   # ou main une fois la branche fusionnée

cp .env.production.example .env
sed -i "s|^PUBLIC_URL=.*|PUBLIC_URL=http://<IP_PUBLIQUE>|" .env
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" .env
sed -i "s|^JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=$(openssl rand -base64 48)|" .env
sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$(openssl rand -base64 48)|" .env
cat .env   # vérifier
```

> Si le dépôt GitHub est privé, `git clone` demandera un identifiant et un **Personal Access Token** (GitHub → Settings → Developer settings → Tokens) à la place du mot de passe.

## 6. Lancer l'application

```bash
docker compose up -d --build          # quelques minutes au premier lancement
docker compose ps                     # les 3 services doivent être "running"/"healthy"
docker compose exec api node dist/prisma/seed.js   # données de démonstration
```

L'application est accessible sur **http://&lt;IP_PUBLIQUE&gt;**. La documentation de l'API est sur **http://&lt;IP_PUBLIQUE&gt;/docs**.

Comptes de démonstration (mot de passe `Nyokah@2026`) : `admin@nyokah.ci`, `jm.kouassi@gmail.com`, `a.toure@orange.ci`, `ibrahim.kone@nyokah.ci`.

---

## Exploitation

| Action | Commande |
|---|---|
| Voir les journaux | `docker compose logs -f api` |
| Mettre à jour | `git pull && docker compose up -d --build` |
| Redémarrer | `docker compose restart` |
| Arrêter | `docker compose down` (les données restent dans le volume) |
| Tout supprimer, base comprise | `docker compose down -v` |
| Sauvegarder la base | `docker compose exec db pg_dump -U nyokah nyokah > sauvegarde.sql` |

Les conteneurs sont configurés avec `restart: unless-stopped` : ils redémarrent seuls après un reboot de l'instance.

## Dépannage

- **La page ne s'ouvre pas** : vérifier que la règle HTTP (80) du groupe de sécurité est ouverte à `0.0.0.0/0`, et que l'URL commence par `http://` et non `https://`.
- **« Origine non autorisée » / connexion impossible** : `PUBLIC_URL` dans `.env` doit correspondre exactement à l'URL tapée dans le navigateur, sans slash final. Après modification : `docker compose up -d`.
- **Le build s'arrête net (« Killed »)** : le swap de l'étape 4 n'est pas actif (`free -h` pour vérifier).
- **L'API redémarre en boucle** : `docker compose logs api`. Le message « Configuration invalide » liste les variables manquantes.

## Pour aller plus loin

- **Nom de domaine + HTTPS** : faire pointer un enregistrement DNS A vers l'IP Elastic, puis placer Caddy ou Certbot devant nginx pour obtenir un certificat Let's Encrypt.
- **Coûts** : arrêter l'instance quand elle ne sert pas. Une IP Elastic non associée à une instance en marche est facturée.
