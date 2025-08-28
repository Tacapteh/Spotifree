# 🎵 Téléchargeur YouTube - Guide d'utilisation

## ⚠️ Avertissement Important

**UTILISEZ CETTE FONCTIONNALITÉ DE MANIÈRE RESPONSABLE**

Cette fonctionnalité de téléchargement YouTube doit être utilisée conformément aux conditions d'utilisation de YouTube et aux lois sur le droit d'auteur de votre juridiction. 

**Utilisez-la uniquement pour :**
- Du contenu que vous possédez
- Du contenu dans le domaine public
- Des créations sous licence Creative Commons
- Vos propres vidéos YouTube

**N'utilisez PAS cette fonctionnalité pour :**
- Télécharger du contenu protégé par le droit d'auteur sans autorisation
- Distribuer ou partager du contenu téléchargé illégalement
- Violer les conditions d'utilisation de YouTube

## 🚀 Fonctionnalités

### ✅ Ce qui est implémenté :

1. **Interface intégrée** dans l'application Spotify clone
2. **Téléchargement audio** en MP3 haute qualité (192kbps)
3. **Gestion des téléchargements** avec base de données MongoDB
4. **Interface utilisateur** intuitive avec notifications
5. **Avertissements légaux** bien visibles

### 🔧 API Backend

Les endpoints suivants sont disponibles :

- `POST /api/youtube/download` - Télécharger l'audio en MP3
- `GET /api/youtube/downloads` - Liste des téléchargements
- `GET /api/youtube/download/{id}/stream` - Streamer un fichier téléchargé
- `DELETE /api/youtube/download/{id}` - Supprimer un téléchargement
- `GET /api/youtube/formats` - Formats audio supportés

## 📱 Guide d'utilisation

### 1. Accéder au téléchargeur
- Depuis l'interface principale Spotify, cliquez sur "YouTube Downloader"
- Vous serez redirigé vers l'interface de téléchargement

### 2. Télécharger une vidéo
1. Copiez l'URL YouTube de la vidéo (ex: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`)
2. Collez l'URL dans le champ de saisie
3. Cliquez sur "Télécharger en MP3" pour lancer le téléchargement

### 3. Gérer vos téléchargements
- Tous les téléchargements apparaissent dans la section "Téléchargements"
- Vous pouvez lire, supprimer ou accéder à la vidéo YouTube originale
- Les fichiers sont stockés sur le serveur et dans la base de données

## 🔧 Configuration technique

### Dépendances Python installées :
- `yt-dlp>=2024.1.30` - Successeur maintenu de youtube-dl
- `youtube-dl>=2021.12.17` - Version classique de l'outil
- `ffmpeg-python>=0.2.0` - Conversion audio
- `imageio-ffmpeg>=0.4.8` - Fournit automatiquement le binaire ffmpeg
- `ffmpeg` - Outil de conversion (fourni automatiquement)

### Formats supportés :
- MP3 (par défaut, 192kbps)
- WAV, AAC, OGG, FLAC (configurables)

### Stockage :
- Fichiers audio : `/tmp/music_downloads/`
- Métadonnées : Base de données MongoDB

### Variables d'environnement :
- `YT_DLP_PROXY` : URL du proxy HTTP à utiliser par `yt-dlp` (optionnel)
- `REACT_APP_API_URL` : URL de base du backend pour le frontend.
  - Par défaut, l'application tente d'appeler `http://<hôte>:10000`.

## 🛡️ Sécurité et limitations

1. **Validation d'URL** : Seules les URLs YouTube valides sont acceptées
2. **Gestion d'erreurs** : Messages d'erreur informatifs pour l'utilisateur
3. **Nettoyage automatique** : Les fichiers temporaires sont gérés automatiquement
4. **Limitations de débit** : Respecte les limitations de YouTube

## 🎯 Utilisation recommandée

### Cas d'usage légitimes :
- Télécharger vos propres créations musicales
- Archiver du contenu éducatif en domaine public
- Convertir des podcasts ou conférences autorisées
- Sauvegarder du contenu Creative Commons

### Bonnes pratiques :
- Vérifiez toujours les droits d'auteur avant de télécharger
- Respectez les conditions d'utilisation de YouTube
- N'utilisez les fichiers téléchargés qu'à des fins personnelles
- Supprimez les téléchargements dont vous n'avez plus besoin

## 🔍 Résolution de problèmes

### Erreurs courantes :
- **"URL invalide"** : Vérifiez le format de l'URL YouTube
- **"Échec du téléchargement"** : La vidéo peut être privée ou géo-bloquée
- **"Fichier manquant"** : Le fichier a peut-être été supprimé du serveur

### Support technique :
- Vérifiez les logs du backend pour plus de détails sur les erreurs
- Le binaire ffmpeg est téléchargé automatiquement; vérifiez son téléchargement en cas d'erreur
- Les téléchargements sont stockés temporairement et peuvent être nettoyés

## 📞 Responsabilité

L'utilisateur est entièrement responsable de l'usage qu'il fait de cette fonctionnalité. Les développeurs de cette application ne sauraient être tenus responsables d'une utilisation inappropriée ou illégale de cet outil.

**Respectez les droits d'auteur. Respectez les créateurs. Utilisez cette fonctionnalité de manière éthique.**