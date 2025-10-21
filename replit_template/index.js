const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

// === [CONFIGURATION DE BASE] ===
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// === [1️⃣ LOGGING] === Journalisation de toutes les requêtes (exigence 4.4)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} (IP: ${req.ip})`);
  next();
});

// === [2️⃣ SESSION] === Pour remplacer le token en clair (exigence 2.2 + 4.1)
app.use(session({
  secret: 'CHANGE_MOI_PAR_UNE_VALEUR_ALEATOIRE_123', // ⚠️ À MODIFIER (ex: "7x!A%2*j8Lp")
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Passe à true si HTTPS
}));

// === [3️⃣ PAGE D'ACCUEIL] === (Partie originale conservée)
app.get('/', (req, res) => {
  res.send(`
    <h1>Intranet RH - Demo</h1>
    <p>Bienvenue sur l'intranet de démonstration. Utilisez le formulaire pour rechercher un employé.</p>
    <form method="POST" action="/search">
      <input name="q" placeholder="Nom ou partie du nom" />
      <button>Search</button>
    </form>
    <p>Endpoints utiles :
      <code>/search</code> (POST),
      <code>/login</code> (POST),
      <code>/admin</code> (protected),
      <code>/flag</code> (secret)
    </p>
    ${req.session.isAdmin ? '<p><a href="/admin">Accès Admin</a> | <a href="/flag">Télécharger le flag</a> | <a href="/logout">Se déconnecter</a></p>' : '<p><a href="/login">Se connecter</a></p>'}
  `);
});

// === [4️⃣ ROUTE /login] === Authentification (exigence 4.1)
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') { // ⚠️ Identifiants bidons (à remplacer en prod)
    req.session.isAdmin = true;
    res.redirect('/'); // Redirige vers l'accueil avec les liens admin
  } else {
    console.log(`[SECURITY] Échec de connexion (IP: ${req.ip})`);
    res.status(401).send('❌ Identifiants invalides.');
  }
});

// === [5️⃣ ROUTE /logout] === Déconnexion
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// === [6️⃣ ROUTE /search] === Validation + Sanitization (exigence 1.1 + 4.3)
app.post('/search', (req, res) => {
  let q = req.body.q;

  // [CORRECTIF] Validation : lettres/tirets/espaces uniquement, max 20 chars
  if (!q || typeof q !== 'string' || q.length > 20 || !/^[a-zA-Z\s-]+$/.test(q)) {
    console.log(`[SECURITY] Requête bloquée : "${q}" (IP: ${req.ip})`);
    return res.status(400).send('⚠️ Requête invalide : lettres, espaces et tirets uniquement (max 20 caractères).');
  }

  // Simulation d'une base de données
  const fakeDatabase = [
    { id: 1, name: "Alice", email: "alice@example.com" },
    { id: 2, name: "Bob", email: "bob@example.com" },
    { id: 3, name: "Charlie", email: "charlie@example.com" },
  ];

  // [CORRECTIF] Limite à 3 résultats (pagination)
  const results = fakeDatabase
    .filter(user => user.name.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 3);

  res.json({
    query: q,
    results: results.map(user => ({ id: user.id, name: user.name })) // [CORRECTIF] Masque les emails
  });
});

// === [7️⃣ ROUTE /admin] === Protection par session (exigence 2.2 + 4.2)
app.get('/admin', (req, res) => {
  if (!req.session.isAdmin) {
    console.log(`[SECURITY] Accès non autorisé à /admin (IP: ${req.ip})`);
    return res.status(403).send('⛔ Accès refusé : droits admin requis.');
  }
  res.send(`
    <h1>Panel Admin</h1>
    <p>Bienvenue, admin !</p>
    <ul>
      <li><a href="/flag">Télécharger le flag</a></li>
      <li><a href="/logout">Se déconnecter</a></li>
    </ul>
  `);
});

// === [8️⃣ ROUTE /flag] === Protection par session (exigence 3.1 + 4.1)
app.get('/flag', (req, res) => {
  if (!req.session.isAdmin) {
    console.log(`[SECURITY] Tentative d'accès non autorisé à /flag (IP: ${req.ip})`);
    return res.status(403).send('⛔ Accès refusé : authentification requise.');
  }
  res.download(path.join(__dirname, 'public', 'flag.txt'), 'flag.txt');
});

// === [9️⃣ ROUTE /login (GET)] === Page de connexion
app.get('/login', (req, res) => {
  res.send(`
    <h1>Connexion Admin</h1>
    <form method="POST" action="/login">
      <input type="text" name="username" placeholder="Username" required />
      <input type="password" name="password" placeholder="Password" required />
      <button type="submit">Se connecter</button>
    </form>
    <p><a href="/">Retour à l'accueil</a></p>
  `);
});

// === [🔥 DÉMARRAGE DU SERVEUR] ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
