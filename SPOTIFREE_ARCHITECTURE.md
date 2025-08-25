# 🎵 Spotifree - Architecture Moderne

## 📋 Vue d'ensemble

**Spotifree** est une bibliothèque musicale personnelle construite avec une architecture moderne TypeScript/JavaScript utilisant :
- **Zustand** pour la gestion d'état
- **IndexedDB** avec fallback localStorage pour la persistance
- **React** avec hooks personnalisés
- **Tailwind CSS** + **shadcn/ui** pour l'interface

## 🏗️ Structure des fichiers créés

### 📁 Types et interfaces (`src/lib/types.ts`)
```typescript
interface Track {
  id: string;
  source: 'local' | 'youtube' | 'spotify';
  sourceId: string;
  title: string;
  artistName: string;
  artistId: string;
  durationMs: number;
  artworkUrl?: string;
  playable: 'local' | 'embed' | 'direct';
  objectUrl?: string;
}

interface Playlist {
  id: string;
  name: string;
  createdAt: Date;
  trackIds: string[];
}

interface History {
  id: string;
  trackId: string;
  playedAt: Date;
  progress: number;
}
```

### 💾 Stockage persistant (`src/lib/storage.js`)
- **Classe `Storage`** avec méthodes `dbGet()`, `dbSet()`, `dbDelete()`
- **IndexedDB primaire** avec **localStorage en fallback**
- **Préfixe automatique** pour éviter les conflits
- **Gestion d'erreurs robuste**

### 🗃️ Store Zustand - Bibliothèque (`src/stores/library.js`)

#### État :
- `tracks: Track[]` - Toutes les pistes
- `playlists: Playlist[]` - Toutes les playlists
- `loaded: boolean` - État de chargement

#### Actions :
- `load()` - Charge depuis le stockage
- `save()` - Sauvegarde l'état actuel
- `addTracks(tracks)` - Ajoute des pistes
- `createPlaylist(name, trackIds?)` - Crée une playlist
- `addToPlaylist(playlistId, trackIds)` - Ajoute à une playlist
- `getTrack(id)`, `getPlaylist(id)`, `getPlaylistTracks(id)` - Getters

### 🎮 Store Zustand - Lecteur (`src/stores/player.js`)

#### État :
- `currentSrc`, `currentTrack` - Piste actuelle
- `playing`, `progress`, `duration`, `volume` - État de lecture
- `queue`, `currentIndex` - File d'attente
- `shuffle`, `repeat` - Modes de lecture

#### Actions :
- `playTrack(track)` - Joue une piste
- `playQueue(tracks, startIndex?)` - Joue une file
- `playNext()`, `playPrevious()` - Navigation
- `toggleShuffle()`, `toggleRepeat()` - Modes
- `onEnded()`, `onTimeUpdate()` - Événements audio

### 🔍 Sélecteurs et hooks (`src/lib/selectors.js`)
- `useArtistsFromPlaylists()` - Agrège les artistes depuis les playlists
- `useAllArtists()` - Tous les artistes de la bibliothèque
- `useTracksByArtist(artistId)` - Pistes par artiste
- `useSearchTracks(query)` - Recherche de pistes

### 📥 Composant d'import (`src/components/LocalImport.jsx`)

#### Fonctionnalités :
- **Sélection multiple** de fichiers audio
- **Parse automatique** des noms "Artiste - Titre.ext"
- **Génération d'ID artiste** normalisé
- **Extraction de durée** via HTML5 Audio API
- **Création d'ObjectURL** pour lecture locale
- **Interface drag & drop** + bouton de sélection
- **Notifications toast** pour le feedback

#### Formats supportés :
- MP3, WAV, M4A, FLAC, OGG

### 🎨 Composant artistes (`src/components/HomeArtists.jsx`)

#### Fonctionnalités :
- **Grille responsive** (2-6 colonnes selon écran)
- **Avatar par défaut** avec icône utilisateur
- **Bouton play au hover** avec animation
- **Callback `onOpenArtist(artistId, artistName)`**
- **Compteur de pistes** par artiste
- **États vides** avec messages informatifs

### 🎵 Composant lecteur (`src/components/Player.jsx`)

#### Fonctionnalités :
- **Élément `<audio>` natif** géré par Zustand
- **Contrôles complets** : play/pause, précédent/suivant
- **Barre de progression** interactive
- **Contrôle de volume** avec slider
- **Modes shuffle/repeat** avec indicateurs visuels
- **Affichage piste actuelle** + artwork
- **Position fixe en bas** avec z-index élevé

## 🔄 Flux de données

### 1. Importation de musique
```
Fichiers → LocalImport → Parse noms → Créer Tracks → Store.addTracks() → Storage.dbSet()
```

### 2. Lecture de musique
```
HomeArtists.onOpenArtist() → Store.playQueue() → Player détecte changement → Audio.play()
```

### 3. Persistance
```
Toute action → Store met à jour → Auto-save → IndexedDB/localStorage
```

## 🎯 Points clés de l'architecture

### ✅ **Avantages**

1. **État centralisé** avec Zustand (plus simple que Redux)
2. **Persistance automatique** avec double fallback
3. **Composants découplés** via hooks et stores
4. **TypeScript-ready** (actuellement en JS pour compatibilité)
5. **Performance optimisée** avec IndexedDB
6. **Interface moderne** avec shadcn/ui
7. **Accessibilité** avec aria-labels et focus management

### 🔧 **Extensibilité**

- **Nouveaux formats** : Ajouter dans `LocalImport`
- **Nouvelles sources** : Étendre l'enum `source`
- **Playlists avancées** : Implémenter dans `library.js`
- **Recherche** : Étendre les sélecteurs
- **Historique** : Utiliser le type `History`
- **Partage** : Ajouter export/import de playlists

## 🚀 Prochaines étapes suggérées

1. **Interface playlists** complète
2. **Recherche globale** avec filtres
3. **Historique de lecture** 
4. **Tags et métadonnées** étendues
5. **Equalizer** et effets audio
6. **Synchronisation cloud** (optionnelle)
7. **PWA** avec service worker
8. **Partage social** de playlists

## 💡 Utilisation

### Lancement :
```bash
cd /app/frontend
yarn start  # Lance sur http://localhost:3000
```

### Import de musique :
1. Cliquer "Choisir des fichiers" ou glisser-déposer
2. Sélectionner fichiers audio (MP3, WAV, etc.)
3. Les pistes apparaissent automatiquement dans "Vos artistes"
4. Cliquer sur un artiste pour lire ses pistes

### Données stockées :
- **IndexedDB** : `spotifree_tracks`, `spotifree_playlists`
- **localStorage** : Fallback automatique si IndexedDB indisponible

L'architecture est conçue pour être **scalable**, **maintenable** et **performante** tout en gardant une expérience utilisateur fluide et moderne.