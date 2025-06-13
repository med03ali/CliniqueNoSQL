import React, { useState, useEffect } from 'react';



// Composant principal de l'application
export default function App() {
  const [connecte, setConnecte] = useState(false);
  const [roleUtilisateur, setRoleUtilisateur] = useState(null); // 'admin', 'medecin', 'patient', ou null
  const [token, setToken] = useState(null); // Le jeton actuel de l'utilisateur

  // Effet pour vérifier le statut d'authentification et le rôle au montage du composant ou lors des changements de jeton
  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    const medecinToken = localStorage.getItem('medecinToken');
    const patientToken = localStorage.getItem('patientToken');

    if (adminToken) {
      setConnecte(true);
      setRoleUtilisateur('admin');
      setToken(adminToken);
    } else if (medecinToken) {
      setConnecte(true);
      setRoleUtilisateur('medecin');
      setToken(medecinToken);
    } else if (patientToken) {
      setConnecte(true);
      setRoleUtilisateur('patient');
      setToken(patientToken);
    } else {
      setConnecte(false);
      setRoleUtilisateur(null);
      setToken(null);
    }
  }, []); // S'exécute une seule fois au montage

  // Fonction pour gérer l'authentification réussie depuis AuthForm
  const gererAuthReussie = (nouveauToken, role) => {
    setToken(nouveauToken);
    setRoleUtilisateur(role);
    setConnecte(true);
    // Le jeton est stocké dans le localStorage par AuthForm lui-même en fonction du rôle
  };

  // Fonction pour gérer la déconnexion générale
  const gererDeconnexion = () => {
    setConnecte(false);
    setRoleUtilisateur(null);
    setToken(null);
    localStorage.removeItem('adminToken');
    localStorage.removeItem('medecinToken');
    localStorage.removeItem('patientToken');
  };

  // Rendu conditionnel des tableaux de bord ou du formulaire d'authentification
  const rendreContenu = () => {
    if (connecte) {
      if (roleUtilisateur === 'admin') {
        return <AdminDashboard token={token} onLogout={gererDeconnexion} />;
      } else if (roleUtilisateur === 'medecin') {
        return <MedecinDashboard token={token} onLogout={gererDeconnexion} />;
      } else if (roleUtilisateur === 'patient') {
        return <PatientDashboard token={token} onLogout={gererDeconnexion} />;
      }
    }
    // Si non connecté ou rôle non reconnu, afficher AuthForm
    return <AuthForm onAuthSuccess={gererAuthReussie} />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-inter">
      {rendreContenu()}
    </div>
  );
}

// Composant AuthForm pour gérer l'inscription et la connexion pour tous les rôles
function AuthForm({ onAuthSuccess }) {
  const [nomUtilisateur, setNomUtilisateur] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [roleSelectionne, setRoleSelectionne] = useState('admin'); // Rôle par défaut pour la connexion
  const [modeInscription, setModeInscription] = useState(false); // true pour l'inscription, false pour la connexion
  const [message, setMessage] = useState('');
  const [typeMessage, setTypeMessage] = useState(''); // 'success' ou 'error'

  const gererSoumission = async (e) => {
    e.preventDefault();
    setMessage('');
    setTypeMessage('');

    if (!nomUtilisateur || !motDePasse) {
      setMessage('Le nom d\'utilisateur et le mot de passe sont requis.');
      setTypeMessage('error');
      return;
    }

    let pointDeTerminaison = '';
    let corpsDeRequete = { username: nomUtilisateur, password: motDePasse };
    let cleJeton = '';

    if (modeInscription) {
      // L'inscription est actuellement uniquement pour le rôle 'admin' via le point de terminaison /register
      pointDeTerminaison = 'http://localhost:5001/register';
      corpsDeRequete.role = 'admin';
      cleJeton = 'adminToken'; // Même s'il s'agit d'une inscription, une connexion admin réussie pourrait suivre ou simplement stocker le jeton
    } else {
      // Connexion basée sur le rôle sélectionné
      switch (roleSelectionne) {
        case 'admin':
          pointDeTerminaison = 'http://localhost:5001/login';
          cleJeton = 'adminToken';
          break;
        case 'medecin':
          pointDeTerminaison = 'http://localhost:5001/login/medecin';
          cleJeton = 'medecinToken';
          break;
        case 'patient':
          pointDeTerminaison = 'http://localhost:5001/login/patient';
          cleJeton = 'patientToken';
          break;
        default:
          setMessage('Veuillez sélectionner un rôle valide.');
          setTypeMessage('error');
          return;
      }
    }

    try {
      const reponse = await fetch(pointDeTerminaison, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(corpsDeRequete),
      });

      const donnees = await reponse.json();

      if (reponse.ok) {
        setMessage(donnees.msg || (modeInscription ? 'Inscription réussie !' : 'Connexion réussie !'));
        setTypeMessage('success');
        setNomUtilisateur('');
        setMotDePasse('');

        if (donnees.access_token) {
          localStorage.setItem(cleJeton, donnees.access_token);
          onAuthSuccess(donnees.access_token, modeInscription ? 'admin' : roleSelectionne);
        }
      } else {
        setMessage(donnees.msg || (modeInscription ? 'Échec de l\'inscription.' : 'Échec de la connexion.'));
        setTypeMessage('error');
      }
    } catch (erreur) {
      console.error('Erreur lors de l\'authentification :', erreur);
      setMessage('Erreur réseau ou serveur inaccessible.');
      setTypeMessage('error');
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-100 transform hover:scale-105 transition-transform duration-300 ease-in-out">
      <div className="text-center mb-6">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-blue-600">
          <svg
            className="h-8 w-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            ></path>
          </svg>
        </div>
      </div>
      <h2 className="text-4xl font-extrabold text-center text-gray-900 mb-8">
        {modeInscription ? 'Inscription Admin' : 'Se Connecter'}
      </h2>

      {/* Basculer entre les modes Inscription et Connexion */}
      <div className="flex justify-center mb-6 space-x-4">
        <button
          type="button"
          onClick={() => setModeInscription(false)}
          className={`py-2 px-6 rounded-lg text-lg font-semibold transition duration-300 ease-in-out ${
            !modeInscription
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Connexion
        </button>
        <button
          type="button"
          onClick={() => setModeInscription(true)}
          className={`py-2 px-6 rounded-lg text-lg font-semibold transition duration-300 ease-in-out ${
            modeInscription
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          S'inscrire (Admin)
        </button>
      </div>

      <form onSubmit={gererSoumission} className="space-y-6">
        {/* Sélection du rôle pour le mode Connexion */}
        {!modeInscription && (
          <div>
            <label htmlFor="role-select" className="block text-base font-semibold text-gray-700 mb-1">
              Sélectionner le Rôle :
            </label>
            <select
              id="role-select"
              value={roleSelectionne}
              onChange={(e) => setRoleSelectionne(e.target.value)}
              className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-base"
            >
              <option value="admin">Admin</option>
              <option value="medecin">Médecin</option>
              <option value="patient">Patient</option>
            </select>
          </div>
        )}

        <div>
          <label htmlFor="username" className="block text-base font-semibold text-gray-700 mb-1">
            Nom d'utilisateur
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={nomUtilisateur}
            onChange={(e) => setNomUtilisateur(e.target.value)}
            className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-base"
            placeholder="Entrez votre nom d'utilisateur"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-base font-semibold text-gray-700 mb-1">
            Mot de passe
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-base"
            placeholder="Entrez votre mot de passe"
            required
          />
        </div>
        {message && (
          <div
            className={`p-4 rounded-lg text-base font-medium ${
              typeMessage === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}
            role="alert"
          >
            {message}
          </div>
        )}
        <div>
          <button
            type="submit"
            className="w-full flex justify-center py-3 px-6 border border-transparent rounded-lg shadow-md text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-300 ease-in-out transform hover:-translate-y-0.5"
          >
            {modeInscription ? 'Inscrire un Compte Admin' : `Se Connecter en tant que ${roleSelectionne.charAt(0).toUpperCase() + roleSelectionne.slice(1)}`}
          </button>
        </div>
      </form>
    </div>
  );
}

// Composant AdminDashboard
function AdminDashboard({ token, onLogout }) {
  // État pour gérer la vue actuelle dans le tableau de bord
  const [vueActuelle, setVueActuelle] = useState('dashboard');
  // État pour conserver l'ID du patient/médecin en cours de mise à jour
  const [idPatientSelectionne, setIdPatientSelectionne] = useState(null);
  const [idMedecinSelectionne, setIdMedecinSelectionne] = useState(null);

  // Fonctions pour gérer la navigation vers les formulaires de mise à jour
  const gererMiseAJourPatient = (patientId) => {
    setIdPatientSelectionne(patientId);
    setVueActuelle('update-patient');
  };

  const gererMiseAJourMedecin = (medecinId) => {
    setIdMedecinSelectionne(medecinId);
    setVueActuelle('update-medecin');
  };

  // Fonction pour revenir au tableau de bord après une action
  const revenirAuTableauDeBord = () => {
    setVueActuelle('dashboard');
    setIdPatientSelectionne(null);
    setIdMedecinSelectionne(null);
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-3xl border border-gray-100 transform hover:scale-105 transition-transform duration-300 ease-in-out">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-4xl font-extrabold text-gray-900">
          Tableau de Bord Admin
        </h2>
        <button
          onClick={onLogout}
          className="py-2 px-6 rounded-lg text-red-600 border border-red-300 hover:bg-red-50 transition duration-300 ease-in-out font-medium"
        >
          Déconnexion
        </button>
      </div>

      <p className="text-gray-700 mb-6 text-center text-lg">
        Bienvenue sur le portail Admin ! Ici, vous pouvez gérer les patients et les médecins.
      </p>

      {vueActuelle === 'dashboard' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <button
            className="w-full py-4 px-6 border border-transparent rounded-lg shadow-md text-xl font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-300 ease-in-out transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
            onClick={() => setVueActuelle('create-patient')}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.242v15.516M4.242 12h15.516"></path></svg>
            <span>Créer Patient</span>
          </button>
          <button
            className="w-full py-4 px-6 border border-transparent rounded-lg shadow-md text-xl font-semibold text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition duration-300 ease-in-out transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
            onClick={() => setVueActuelle('create-medecin')}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.242v15.516M4.242 12h15.516"></path></svg>
            <span>Créer Médecin</span>
          </button>
          <button
            className="w-full py-4 px-6 border border-transparent rounded-lg shadow-md text-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-300 ease-in-out transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
            onClick={() => setVueActuelle('list-patients')}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
            <span>Lister Patients</span>
          </button>
          <button
            className="w-full py-4 px-6 border border-transparent rounded-lg shadow-md text-xl font-semibold text-white bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition duration-300 ease-in-out transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
            onClick={() => setVueActuelle('list-medecins')}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
            <span>Lister Médecins</span>
          </button>
          <button
            className="w-full py-4 px-6 border border-transparent rounded-lg shadow-md text-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-300 ease-in-out transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 col-span-full"
            onClick={() => setVueActuelle('assign-medecin-to-patient')}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v4a1 1 0 001 1h4a1 1 0 001-1V7m0 10a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4a1 1 0 011-1h4a1 1 0 011 1v4m-5-6h.01M17 10h.01M12 21h.01M12 3h.01M21 12h.01M3 12h.01M12 7.757V4.243a1 1 0 011.707-.707l3.536 3.536a1 1 0 010 1.414l-3.536 3.536A1 1 0 0112 12.243v-3.516"></path></svg>
            <span>Assigner Médecin à Patient</span>
          </button>
        </div>
      )}

      {vueActuelle === 'create-patient' && (
        <CreatePatientForm token={token} onBack={revenirAuTableauDeBord} />
      )}

      {vueActuelle === 'create-medecin' && (
        <CreateMedecinForm token={token} onBack={revenirAuTableauDeBord} />
      )}

      {vueActuelle === 'list-patients' && (
        <ListPatients token={token} onBack={revenirAuTableauDeBord} onUpdate={gererMiseAJourPatient} />
      )}

      {vueActuelle === 'list-medecins' && (
        <ListMedecins token={token} onBack={revenirAuTableauDeBord} onUpdate={gererMiseAJourMedecin} />
      )}

      {vueActuelle === 'assign-medecin-to-patient' && (
        <AssignMedecinToPatientForm token={token} onBack={revenirAuTableauDeBord} />
      )}

      {vueActuelle === 'update-patient' && idPatientSelectionne && (
        <UpdatePatientForm token={token} patientId={idPatientSelectionne} onBack={revenirAuTableauDeBord} onSuccess={revenirAuTableauDeBord} />
      )}

      {vueActuelle === 'update-medecin' && idMedecinSelectionne && (
        <UpdateMedecinForm token={token} medecinId={idMedecinSelectionne} onBack={revenirAuTableauDeBord} onSuccess={revenirAuTableauDeBord} />
      )}
    </div>
  );
}

// Composant CreatePatientForm
function CreatePatientForm({ token, onBack }) {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [message, setMessage] = useState('');
  const [typeMessage, setTypeMessage] = useState('');

  const gererSoumission = async (e) => {
    e.preventDefault();
    setMessage('');
    setTypeMessage('');

    if (!nom || !prenom) {
      setMessage('Le Nom et le Prénom sont requis.');
      setTypeMessage('error');
      return;
    }

    try {
      const reponse = await fetch('http://localhost:5001/admin/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nom, prenom }),
      });

      const donnees = await reponse.json();

      if (reponse.ok) {
        setMessage(donnees.msg || 'Patient créé avec succès !');
        setTypeMessage('success');
        setNom('');
        setPrenom('');
      } else {
        setMessage(donnees.msg || 'Échec de la création du patient.');
        setTypeMessage('error');
      }
    } catch (erreur) {
      console.error('Erreur lors de la création du patient :', erreur);
      setMessage('Erreur réseau ou serveur inaccessible.');
      setTypeMessage('error');
    }
  };

  return (
    <div className="mt-8 p-8 bg-blue-50 rounded-lg border border-blue-200 shadow-inner">
      <h3 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Créer un Nouveau Patient</h3>
      <form onSubmit={gererSoumission} className="space-y-6">
        <div>
          <label htmlFor="patient-nom" className="block text-base font-semibold text-gray-700 mb-1">
            Nom de famille (Nom)
          </label>
          <input
            type="text"
            id="patient-nom"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-base"
            placeholder="Entrez le nom de famille du patient"
            required
          />
        </div>
        <div>
          <label htmlFor="patient-prenom" className="block text-base font-semibold text-gray-700 mb-1">
            Prénom (Prenom)
          </label>
          <input
            type="text"
            id="patient-prenom"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-base"
            placeholder="Entrez le prénom du patient"
            required
          />
        </div>
        {message && (
          <div
            className={`p-4 rounded-lg text-base font-medium ${
              typeMessage === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
            }`}
            role="alert"
          >
            {message}
          </div>
        )}
        <div className="flex justify-between items-center">
          <button
            type="submit"
            className="py-3 px-6 border border-transparent rounded-lg shadow-md text-lg font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-300 ease-in-out transform hover:-translate-y-0.5"
          >
            Ajouter Patient
          </button>
          <button
            onClick={onBack}
            type="button"
            className="py-2 px-4 rounded-lg text-blue-600 border border-blue-300 hover:bg-blue-100 transition duration-300 ease-in-out font-medium"
          >
            Retour au Tableau de Bord
          </button>
        </div>
      </form>
    </div>
  );
}

// Composant CreateMedecinForm
function CreateMedecinForm({ token, onBack }) {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [specialite, setSpecialite] = useState('');
  const [message, setMessage] = useState('');
  const [typeMessage, setTypeMessage] = useState('');

  const gererSoumission = async (e) => {
    e.preventDefault();
    setMessage('');
    setTypeMessage('');

    if (!nom || !prenom || !specialite) {
      setMessage('Le Nom, le Prénom et la Spécialité sont requis.');
      setTypeMessage('error');
      return;
    }

    try {
      const reponse = await fetch('http://localhost:5001/admin/medecins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nom, prenom, specialite }),
      });

      const donnees = await reponse.json();

      if (reponse.ok) {
        setMessage(donnees.msg || 'Médecin créé avec succès !');
        setTypeMessage('success');
        setNom('');
        setPrenom('');
        setSpecialite('');
      } else {
        setMessage(donnees.msg || 'Échec de la création du médecin.');
        setTypeMessage('error');
      }
    } catch (erreur) {
      console.error('Erreur lors de la création du médecin :', erreur);
      setMessage('Erreur réseau ou serveur inaccessible.');
      setTypeMessage('error');
    }
  };

  return (
    <div className="mt-8 p-8 bg-purple-50 rounded-lg border border-purple-200 shadow-inner">
      <h3 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Créer un Nouveau Médecin</h3>
      <form onSubmit={gererSoumission} className="space-y-6">
        <div>
          <label htmlFor="medecin-nom" className="block text-base font-semibold text-gray-700 mb-1">
            Nom de famille (Nom)
          </label>
          <input
            type="text"
            id="medecin-nom"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-base"
            placeholder="Entrez le nom de famille du médecin"
            required
          />
        </div>
        <div>
          <label htmlFor="medecin-prenom" className="block text-base font-semibold text-gray-700 mb-1">
            Prénom (Prenom)
          </label>
          <input
            type="text"
            id="medecin-prenom"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-base"
            placeholder="Entrez le prénom du médecin"
            required
          />
        </div>
        <div>
          <label htmlFor="medecin-specialite" className="block text-base font-semibold text-gray-700 mb-1">
            Spécialité (Specialite)
          </label>
          <input
            type="text"
            id="medecin-specialite"
            value={specialite}
            onChange={(e) => setSpecialite(e.target.value)}
            className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-base"
            placeholder="Ex : Cardiologie, Pédiatrie"
            required
          />
        </div>
        {message && (
          <div
            className={`p-4 rounded-lg text-base font-medium ${
              typeMessage === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
            }`}
            role="alert"
          >
            {message}
          </div>
        )}
        <div className="flex justify-between items-center">
          <button
            type="submit"
            className="py-3 px-6 border border-transparent rounded-lg shadow-md text-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition duration-300 ease-in-out transform hover:-translate-y-0.5"
          >
            Ajouter Médecin
          </button>
          <button
            onClick={onBack}
            type="button"
            className="py-2 px-4 rounded-lg text-blue-600 border border-blue-300 hover:bg-blue-100 transition duration-300 ease-in-out font-medium"
          >
            Retour au Tableau de Bord
          </button>
        </div>
      </form>
    </div>
  );
}

// Composant ListPatients (MODIFIÉ pour inclure les boutons Mettre à jour/Supprimer)
function ListPatients({ token, onBack, onUpdate }) {
  const [patients, setPatients] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [message, setMessage] = useState(''); // Pour les messages de suppression
  const [typeMessage, setTypeMessage] = useState('');

  const recupererPatients = async () => {
    try {
      const reponse = await fetch('http://localhost:5001/admin/patients', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (!reponse.ok) {
        throw new Error(`Erreur HTTP ! statut : ${reponse.status}`);
      }
      const donnees = await reponse.json();
      setPatients(donnees);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    recupererPatients();
  }, [token]);

  const gererSuppression = async (patientId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce patient ?')) {
      setMessage('');
      setTypeMessage('');
      try {
        const reponse = await fetch(`http://localhost:5001/admin/patients/${patientId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          },
        });

        const donnees = await reponse.json();

        if (reponse.ok) {
          setMessage(donnees.msg || 'Patient supprimé avec succès !');
          setTypeMessage('success');
          recupererPatients(); // Re-fetch la liste après suppression
        } else {
          setMessage(donnees.msg || 'Échec de la suppression du patient.');
          setTypeMessage('error');
        }
      } catch (erreur) {
        console.error('Erreur lors de la suppression du patient :', erreur);
        setMessage('Erreur réseau ou serveur inaccessible.');
        setTypeMessage('error');
      }
    }
  };

  return (
    <div className="mt-8 p-8 bg-blue-50 rounded-lg border border-blue-200 shadow-inner w-full">
      <h3 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Tous les Patients</h3>
      {chargement && <p className="text-center text-blue-700">Chargement des patients...</p>}
      {erreur && <p className="text-center text-red-600">Erreur : {erreur}</p>}
      {message && (
        <div
          className={`p-4 rounded-lg text-base font-medium mb-4 ${
            typeMessage === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
          }`}
          role="alert"
        >
          {message}
        </div>
      )}
      {!chargement && !erreur && (
        <>
          {patients.length === 0 ? (
            <p className="text-center text-gray-600">Aucun patient trouvé.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg shadow-md">
                <thead className="bg-blue-100 border-b border-blue-200">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 rounded-tl-lg">ID</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Nom</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Prénom</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Nom d'utilisateur</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 rounded-tr-lg">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient._id} className="border-b border-gray-200 hover:bg-blue-50">
                      <td className="py-3 px-4 text-sm text-gray-800">{patient._id.substring(0, 8)}...</td>
                      <td className="py-3 px-4 text-sm text-gray-800">{patient.nom}</td>
                      <td className="py-3 px-4 text-sm text-gray-800">{patient.prenom}</td>
                      <td className="py-3 px-4 text-sm text-gray-800">{patient.username}</td>
                      <td className="py-3 px-4 text-sm text-gray-800 space-x-2 flex">
                        <button
                          onClick={() => onUpdate(patient._id)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-md transition duration-200 ease-in-out"
                        >
                          Mettre à jour
                        </button>
                        <button
                          onClick={() => gererSuppression(patient._id)}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md transition duration-200 ease-in-out"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button
            onClick={onBack}
            className="mt-6 py-2 px-4 rounded-lg text-blue-600 border border-blue-300 hover:bg-blue-100 transition duration-300 ease-in-out font-medium"
          >
            Retour au Tableau de Bord
          </button>
        </>
      )}
    </div>
  );
}

// Composant ListMedecins (MODIFIÉ pour inclure les boutons Mettre à jour/Supprimer)
function ListMedecins({ token, onBack, onUpdate }) {
  const [medecins, setMedecins] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [message, setMessage] = useState(''); // Pour les messages de suppression
  const [typeMessage, setTypeMessage] = useState('');

  const recupererMedecins = async () => {
    try {
      const reponse = await fetch('http://localhost:5001/admin/medecins', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (!reponse.ok) {
        throw new Error(`Erreur HTTP ! statut : ${reponse.status}`);
      }
      const donnees = await reponse.json();
      setMedecins(donnees);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    recupererMedecins();
  }, [token]);

  const gererSuppression = async (medecinId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce médecin ?')) {
      setMessage('');
      setTypeMessage('');
      try {
        const reponse = await fetch(`http://localhost:5001/admin/medecins/${medecinId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          },
        });

        const donnees = await reponse.json();

        if (reponse.ok) {
          setMessage(donnees.msg || 'Médecin supprimé avec succès !');
          setTypeMessage('success');
          recupererMedecins(); // Re-fetch la liste après suppression
        } else {
          setMessage(donnees.msg || 'Échec de la suppression du médecin.');
          setTypeMessage('error');
        }
      } catch (erreur) {
        console.error('Erreur lors de la suppression du médecin :', erreur);
        setMessage('Erreur réseau ou serveur inaccessible.');
        setTypeMessage('error');
      }
    }
  };

  return (
    <div className="mt-8 p-8 bg-purple-50 rounded-lg border border-purple-200 shadow-inner w-full">
      <h3 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Tous les Médecins</h3>
      {chargement && <p className="text-center text-purple-700">Chargement des médecins...</p>}
      {erreur && <p className="text-center text-red-600">Erreur : {erreur}</p>}
      {message && (
        <div
          className={`p-4 rounded-lg text-base font-medium mb-4 ${
            typeMessage === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
          }`}
          role="alert"
        >
          {message}
        </div>
      )}
      {!chargement && !erreur && (
        <>
          {medecins.length === 0 ? (
            <p className="text-center text-gray-600">Aucun médecin trouvé.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg shadow-md">
                <thead className="bg-purple-100 border-b border-purple-200">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 rounded-tl-lg">ID</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Nom</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Prénom</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Spécialité</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Nom d'utilisateur</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 rounded-tr-lg">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {medecins.map((medecin) => (
                    <tr key={medecin._id} className="border-b border-gray-200 hover:bg-purple-50">
                      <td className="py-3 px-4 text-sm text-gray-800">{medecin._id.substring(0, 8)}...</td>
                      <td className="py-3 px-4 text-sm text-gray-800">{medecin.nom}</td>
                      <td className="py-3 px-4 text-sm text-gray-800">{medecin.prenom}</td>
                      <td className="py-3 px-4 text-sm text-gray-800">{medecin.specialite}</td>
                      <td className="py-3 px-4 text-sm text-gray-800">{medecin.username}</td>
                      <td className="py-3 px-4 text-sm text-gray-800 space-x-2 flex">
                        <button
                          onClick={() => onUpdate(medecin._id)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-md transition duration-200 ease-in-out"
                        >
                          Mettre à jour
                        </button>
                        <button
                          onClick={() => gererSuppression(medecin._id)}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md transition duration-200 ease-in-out"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button
            onClick={onBack}
            className="mt-6 py-2 px-4 rounded-lg text-blue-600 border border-blue-300 hover:bg-blue-100 transition duration-300 ease-in-out font-medium"
          >
            Retour au Tableau de Bord
          </button>
        </>
      )}
    </div>
  );
}

// Composant UpdatePatientForm
function UpdatePatientForm({ token, patientId, onBack, onSuccess }) {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [message, setMessage] = useState('');
  const [typeMessage, setTypeMessage] = useState('');

  useEffect(() => {
    const recupererPatient = async () => {
      try {
        const reponse = await fetch(`http://localhost:5001/admin/patients/${patientId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
        });
        if (!reponse.ok) throw new Error(`Erreur HTTP ! statut : ${reponse.status}`);
        const donnees = await reponse.json();
        setNom(donnees.nom);
        setPrenom(donnees.prenom);
      } catch (err) {
        setErreur(err.message);
      } finally {
        setChargement(false);
      }
    };
    recupererPatient();
  }, [token, patientId]);

  const gererSoumission = async (e) => {
    e.preventDefault();
    setMessage('');
    setTypeMessage('');

    if (!nom || !prenom) {
      setMessage('Le Nom et le Prénom sont requis.');
      setTypeMessage('error');
      return;
    }

    try {
      const reponse = await fetch(`http://localhost:5001/admin/patients/${patientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nom, prenom }),
      });

      const donnees = await reponse.json();

      if (reponse.ok) {
        setMessage(donnees.msg || 'Patient mis à jour avec succès !');
        setTypeMessage('success');
        onSuccess(); // Appeler le callback de succès pour rafraîchir la liste/le tableau de bord parent
      } else {
        setMessage(donnees.msg || 'Échec de la mise à jour du patient.');
        setTypeMessage('error');
      }
    } catch (erreur) {
      console.error('Erreur lors de la mise à jour du patient :', erreur);
      setMessage('Erreur réseau ou serveur inaccessible.');
      setTypeMessage('error');
    }
  };

  if (chargement) return <p className="text-center text-blue-700 mt-8">Chargement des données du patient...</p>;
  if (erreur) return <p className="text-center text-red-600 mt-8">Erreur de chargement du patient : {erreur}</p>;

  return (
    <div className="mt-8 p-8 bg-yellow-50 rounded-lg border border-yellow-200 shadow-inner">
      <h3 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Mettre à jour le Patient</h3>
      <form onSubmit={gererSoumission} className="space-y-6">
        <div>
          <label htmlFor="update-patient-nom" className="block text-base font-semibold text-gray-700 mb-1">
            Nom de famille (Nom)
          </label>
          <input
            type="text"
            id="update-patient-nom"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 sm:text-base"
            placeholder="Entrez le nom de famille du patient"
            required
          />
        </div>
        <div>
          <label htmlFor="update-patient-prenom" className="block text-base font-semibold text-gray-700 mb-1">
            Prénom (Prenom)
          </label>
          <input
            type="text"
            id="update-patient-prenom"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 sm:text-base"
            placeholder="Entrez le prénom du patient"
            required
          />
        </div>
        {message && (
          <div
            className={`p-4 rounded-lg text-base font-medium ${
              typeMessage === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
            }`}
            role="alert"
          >
            {message}
          </div>
        )}
        <div className="flex justify-between items-center">
          <button
            type="submit"
            className="py-3 px-6 border border-transparent rounded-lg shadow-md text-lg font-semibold text-white bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition duration-300 ease-in-out transform hover:-translate-y-0.5"
          >
            Mettre à jour le Patient
          </button>
          <button
            onClick={onBack}
            type="button"
            className="py-2 px-4 rounded-lg text-blue-600 border border-blue-300 hover:bg-blue-100 transition duration-300 ease-in-out font-medium"
          >
            Retour au Tableau de Bord
          </button>
        </div>
      </form>
    </div>
  );
}

// Composant UpdateMedecinForm
function UpdateMedecinForm({ token, medecinId, onBack, onSuccess }) {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [specialite, setSpecialite] = useState('');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [message, setMessage] = useState('');
  const [typeMessage, setTypeMessage] = useState('');

  useEffect(() => {
    const recupererMedecin = async () => {
      try {
        const reponse = await fetch(`http://localhost:5001/admin/medecins/${medecinId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
        });
        if (!reponse.ok) throw new Error(`Erreur HTTP ! statut : ${reponse.status}`);
        const donnees = await reponse.json();
        setNom(donnees.nom);
        setPrenom(donnees.prenom);
        setSpecialite(donnees.specialite);
      } catch (err) {
        setErreur(err.message);
      } finally {
        setChargement(false);
      }
    };
    recupererMedecin();
  }, [token, medecinId]);

  const gererSoumission = async (e) => {
    e.preventDefault();
    setMessage('');
    setTypeMessage('');

    if (!nom || !prenom || !specialite) {
      setMessage('Le Nom, le Prénom et la Spécialité sont requis.');
      setTypeMessage('error');
      return;
    }

    try {
      const reponse = await fetch(`http://localhost:5001/admin/medecins/${medecinId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nom, prenom, specialite }),
      });

      const donnees = await reponse.json();

      if (reponse.ok) {
        setMessage(donnees.msg || 'Médecin mis à jour avec succès !');
        setTypeMessage('success');
        onSuccess(); // Appeler le callback de succès pour rafraîchir la liste/le tableau de bord parent
      } else {
        setMessage(donnees.msg || 'Échec de la mise à jour du médecin.');
        setTypeMessage('error');
      }
    } catch (erreur) {
      console.error('Erreur lors de la mise à jour du médecin :', erreur);
      setMessage('Erreur réseau ou serveur inaccessible.');
      setTypeMessage('error');
    }
  };

  if (chargement) return <p className="text-center text-purple-700 mt-8">Chargement des données du médecin...</p>;
  if (erreur) return <p className="text-center text-red-600 mt-8">Erreur de chargement du médecin : {erreur}</p>;

  return (
    <div className="mt-8 p-8 bg-orange-50 rounded-lg border border-orange-200 shadow-inner">
      <h3 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Mettre à jour le Médecin</h3>
      <form onSubmit={gererSoumission} className="space-y-6">
        <div>
          <label htmlFor="update-medecin-nom" className="block text-base font-semibold text-gray-700 mb-1">
            Nom de famille (Nom)
          </label>
          <input
            type="text"
            id="update-medecin-nom"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-base"
            placeholder="Entrez le nom de famille du médecin"
            required
          />
        </div>
        <div>
          <label htmlFor="update-medecin-prenom" className="block text-base font-semibold text-gray-700 mb-1">
            Prénom (Prenom)
          </label>
          <input
            type="text"
            id="update-medecin-prenom"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-base"
            placeholder="Entrez le prénom du médecin"
            required
          />
        </div>
        <div>
          <label htmlFor="update-medecin-specialite" className="block text-base font-semibold text-gray-700 mb-1">
            Spécialité (Specialite)
          </label>
          <input
            type="text"
            id="update-medecin-specialite"
            value={specialite}
            onChange={(e) => setSpecialite(e.target.value)}
            className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-base"
            placeholder="Ex : Cardiologie, Pédiatrie"
            required
          />
        </div>
        {message && (
          <div
            className={`p-4 rounded-lg text-base font-medium ${
              typeMessage === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
            }`}
            role="alert"
          >
            {message}
          </div>
        )}
        <div className="flex justify-between items-center">
          <button
            type="submit"
            className="py-3 px-6 border border-transparent rounded-lg shadow-md text-lg font-semibold text-white bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition duration-300 ease-in-out transform hover:-translate-y-0.5"
          >
            Mettre à jour le Médecin
          </button>
          <button
            onClick={onBack}
            type="button"
            className="py-2 px-4 rounded-lg text-blue-600 border border-blue-300 hover:bg-blue-100 transition duration-300 ease-in-out font-medium"
          >
            Retour au Tableau de Bord
          </button>
        </div>
      </form>
    </div>
  );
}

// Composant MedecinDashboard (MODIFIÉ pour inclure la gestion des consultations)
function MedecinDashboard({ token, onLogout }) {
  const [vueActuelle, setVueActuelle] = useState('dashboard'); // 'dashboard', 'my-patients', 'create-consultation', 'my-consultations', 'settings', 'update-consultation'
  const [idConsultationSelectionnee, setIdConsultationSelectionnee] = useState(null); // État pour conserver l'ID de la consultation en cours de mise à jour

  // Fonction pour gérer la navigation vers le formulaire de mise à jour de consultation
  const gererMiseAJourConsultation = (consultationId) => {
    setIdConsultationSelectionnee(consultationId);
    setVueActuelle('update-consultation');
  };

  // Fonction pour revenir au tableau de bord après une action
  const revenirAuTableauDeBord = () => {
    setVueActuelle('dashboard');
    setIdConsultationSelectionnee(null); // Effacer l'ID de la consultation sélectionnée
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-3xl border border-gray-100 transform hover:scale-105 transition-transform duration-300 ease-in-out">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-4xl font-extrabold text-gray-900">
          Tableau de Bord du Médecin
        </h2>
        <button
          onClick={onLogout}
          className="py-2 px-6 rounded-lg text-red-600 border border-red-300 hover:bg-red-50 transition duration-300 ease-in-out font-medium"
        >
          Déconnexion
        </button>
      </div>

      <p className="text-gray-700 mb-6 text-center text-lg">
        Bienvenue, Docteur ! Gérer vos patients et vos consultations ici.
      </p>

      {vueActuelle === 'dashboard' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <button
            className="w-full py-4 px-6 border border-transparent rounded-lg shadow-md text-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-300 ease-in-out transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
            onClick={() => setVueActuelle('my-patients')}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h-10a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 2v11a2 2 0 01-2 2z"></path></svg>
            <span>Lister Mes Patients</span>
          </button>
          <button
            className="w-full py-4 px-6 border border-transparent rounded-lg shadow-md text-xl font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-300 ease-in-out transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
            onClick={() => setVueActuelle('create-consultation')}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.242v15.516M4.242 12h15.516"></path></svg>
            <span>Créer Consultation</span>
          </button>
          <button
            className="w-full py-4 px-6 border border-transparent rounded-lg shadow-md text-xl font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition duration-300 ease-in-out transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
            onClick={() => setVueActuelle('my-consultations')}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
            <span>Lister Mes Consultations</span>
          </button>
          <button
            className="w-full py-4 px-6 border border-transparent rounded-lg shadow-md text-xl font-semibold text-white bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-300 ease-in-out transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
            onClick={() => setVueActuelle('settings')}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            <span>Paramètres</span>
          </button>
        </div>
      )}

      {vueActuelle === 'my-patients' && (
        <ListMyPatients token={token} onBack={revenirAuTableauDeBord} />
      )}

      {vueActuelle === 'create-consultation' && (
        <CreateConsultationForm token={token} onBack={revenirAuTableauDeBord} />
      )}

      {vueActuelle === 'my-consultations' && (
        <ListMyConsultations token={token} onBack={revenirAuTableauDeBord} onUpdate={gererMiseAJourConsultation} />
      )}

      {vueActuelle === 'settings' && (
        <DoctorSettings token={token} onBack={revenirAuTableauDeBord} />
      )}

      {vueActuelle === 'update-consultation' && idConsultationSelectionnee && (
        <UpdateConsultationForm token={token} consultationId={idConsultationSelectionnee} onBack={revenirAuTableauDeBord} onSuccess={revenirAuTableauDeBord} />
      )}
    </div>
  );
}

// Composant ListMyPatients (pour les médecins)
function ListMyPatients({ token, onBack }) {
  const [patients, setPatients] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    const recupererMesPatients = async () => {
      try {
        const reponse = await fetch('http://localhost:5001/medecin/mes_patients', {
          headers: {
            'Authorization': `Bearer ${token}`
          },
        });

        if (!reponse.ok) {
          const texteErreur = await reponse.text();
          console.error('Texte de réponse HTTP Erreur (ListMyPatients) :', texteErreur);
          throw new Error(`Erreur HTTP ! statut : ${reponse.status} - ${texteErreur}`);
        }
        const donnees = await reponse.json();
        setPatients(donnees);
      } catch (err) {
        console.error('Erreur lors de la récupération de mes patients :', err);
        setErreur(err.message);
      } finally {
        setChargement(false);
      }
    };

    recupererMesPatients();
  }, [token]);

  useEffect(() => {
    console.log('État actuel des patients (après définition, ListMyPatients) :', patients);
  }, [patients]);


  return (
    <div className="mt-8 p-8 bg-blue-50 rounded-lg border border-blue-200 shadow-inner w-full">
      <h3 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Mes Patients</h3>
      {chargement && <p className="text-center text-blue-700">Chargement des patients...</p>}
      {erreur && <p className="text-center text-red-600">Erreur : {erreur}</p>}
      {!chargement && !erreur && (
        <>
          {patients.length === 0 ? (
            <p className="text-center text-gray-600">Vous n'avez pas encore de patients assignés.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg shadow-md">
                <thead className="bg-blue-100 border-b border-blue-200">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 rounded-tl-lg">ID</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Nom</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Prénom</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 rounded-tr-lg">Nom d'utilisateur</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient._id} className="border-b border-gray-200 hover:bg-blue-50">
                      <td className="py-3 px-4 text-sm text-gray-800">{patient._id.substring(0, 8)}...</td>
                      <td className="py-3 px-4 text-sm text-gray-800">{patient.nom}</td>
                      <td className="py-3 px-4 text-sm text-gray-800">{patient.prenom}</td>
                      <td className="py-3 px-4 text-sm text-gray-800">{patient.username}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button
            onClick={onBack}
            className="mt-6 py-2 px-4 rounded-lg text-blue-600 border border-blue-300 hover:bg-blue-100 transition duration-300 ease-in-out font-medium"
          >
            Retour au Tableau de Bord
          </button>
        </>
      )}
    </div>
  );
}

// Composant CreateConsultationForm (pour les médecins)
function CreateConsultationForm({ token, onBack }) {
  const [patients, setPatients] = useState([]);
  const [idPatientSelectionne, setIdPatientSelectionne] = useState('');
  const [dateHeure, setDateHeure] = useState('');
  const [motif, setMotif] = useState('');
  const [chargementPatients, setChargementPatients] = useState(true);
  const [erreurPatients, setErreurPatients] = useState(null);
  const [message, setMessage] = useState('');
  const [typeMessage, setTypeMessage] = useState('');

  // Récupérer les patients assignés au médecin connecté
  useEffect(() => {
    const recupererMesPatients = async () => {
      try {
        const reponse = await fetch('http://localhost:5001/medecin/mes_patients', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!reponse.ok) {
          throw new Error(`Erreur HTTP ! statut : ${reponse.status}`);
        }
        const donnees = await reponse.json();
        setPatients(donnees);
      } catch (err) {
        setErreurPatients(err.message);
      } finally {
        setChargementPatients(false);
      }
    };

    recupererMesPatients();
  }, [token]);

  const gererSoumission = async (e) => {
    e.preventDefault();
    setMessage('');
    setTypeMessage('');

    if (!idPatientSelectionne || !dateHeure || !motif) {
      setMessage('Tous les champs sont requis.');
      setTypeMessage('error');
      return;
    }

    try {
      const reponse = await fetch('http://localhost:5001/medecin/consultations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          patient_id: idPatientSelectionne,
          date_heure: dateHeure,
          motif: motif,
        }),
      });

      const donnees = await reponse.json();

      if (reponse.ok) {
        setMessage(donnees.msg || 'Consultation créée avec succès !');
        setTypeMessage('success');
        setIdPatientSelectionne('');
        setDateHeure('');
        setMotif('');
      } else {
        setMessage(donnees.msg || 'Échec de la création de la consultation.');
        setTypeMessage('error');
      }
    } catch (erreur) {
      console.error('Erreur lors de la création de la consultation :', erreur);
      setMessage('Erreur réseau ou serveur inaccessible.');
      setTypeMessage('error');
    }
  };

  return (
    <div className="mt-8 p-8 bg-green-50 rounded-lg border border-green-200 shadow-inner w-full">
      <h3 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Créer une Nouvelle Consultation</h3>
      {(chargementPatients) && <p className="text-center text-gray-700">Chargement de la liste des patients...</p>}
      {(erreurPatients) && (
        <p className="text-center text-red-600">Erreur lors du chargement des patients : {erreurPatients}</p>
      )}

      {!chargementPatients && !erreurPatients && (
        <form onSubmit={gererSoumission} className="space-y-6">
          <div>
            <label htmlFor="select-patient-for-consultation" className="block text-base font-semibold text-gray-700 mb-1">
              Sélectionner le patient :
            </label>
            <select
              id="select-patient-for-consultation"
              value={idPatientSelectionne}
              onChange={(e) => setIdPatientSelectionne(e.target.value)}
              className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-base"
              required
            >
              <option value="">-- Choisir un Patient --</option>
              {patients.map((patient) => (
                <option key={patient._id} value={patient._id}>
                  {patient.nom} {patient.prenom} (Nom d'utilisateur : {patient.username})
                </option>
              ))}
            </select>
            {patients.length === 0 && <p className="text-sm text-gray-500 mt-2">Aucun patient ne vous est assigné. Les consultations ne peuvent être créées que pour les patients assignés.</p>}
          </div>

          <div>
            <label htmlFor="consultation-date-heure" className="block text-base font-semibold text-gray-700 mb-1">
              Date et Heure
            </label>
            <input
              type="datetime-local"
              id="consultation-date-heure"
              value={dateHeure}
              onChange={(e) => setDateHeure(e.target.value)}
              className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-base"
              required
            />
          </div>

          <div>
            <label htmlFor="consultation-motif" className="block text-base font-semibold text-gray-700 mb-1">
              Motif
            </label>
            <textarea
              id="consultation-motif"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              rows="4"
              className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-base"
              placeholder="Entrez le motif de la consultation"
              required
            ></textarea>
          </div>

          {message && (
            <div
              className={`p-4 rounded-lg text-base font-medium ${
                typeMessage === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
              }`}
              role="alert"
            >
              {message}
            </div>
          )}
          <div className="flex justify-between items-center">
            <button
              type="submit"
              className="py-3 px-6 border border-transparent rounded-lg shadow-md text-lg font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-300 ease-in-out transform hover:-translate-y-0.5"
              disabled={patients.length === 0}
            >
              Créer Consultation
            </button>
            <button
              onClick={onBack}
              type="button"
              className="py-2 px-4 rounded-lg text-blue-600 border border-blue-300 hover:bg-blue-100 transition duration-300 ease-in-out font-medium"
            >
              Retour au Tableau de Bord
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// Composant PatientDashboard (MODIFIÉ pour inclure de nouvelles options)
function PatientDashboard({ token, onLogout }) {
  const [vueActuelle, setVueActuelle] = useState('dashboard'); // 'dashboard', 'my-consultations', 'settings'

  return (
    <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-3xl border border-gray-100 transform hover:scale-105 transition-transform duration-300 ease-in-out">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-4xl font-extrabold text-gray-900">
          Tableau de Bord du Patient
        </h2>
        <button
          onClick={onLogout}
          className="py-2 px-6 rounded-lg text-red-600 border border-red-300 hover:bg-red-50 transition duration-300 ease-in-out font-medium"
        >
          Déconnexion
        </button>
      </div>
      <p className="text-gray-700 mb-6 text-center text-lg">
        Bienvenue, Patient ! Ici, vous pouvez consulter vos consultations et gérer vos paramètres.
      </p>

      {vueActuelle === 'dashboard' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <button
            className="w-full py-4 px-6 border border-transparent rounded-lg shadow-md text-xl font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition duration-300 ease-in-out transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
            onClick={() => setVueActuelle('my-consultations')}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
            <span>Voir Mes Consultations</span>
          </button>
          <button
            className="w-full py-4 px-6 border border-transparent rounded-lg shadow-md text-xl font-semibold text-white bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-300 ease-in-out transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
            onClick={() => setVueActuelle('settings')}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            <span>Paramètres</span>
          </button>
        </div>
      )}

      {vueActuelle === 'my-consultations' && (
        <ListMyConsultationsPatient token={token} onBack={() => setVueActuelle('dashboard')} />
      )}

      {vueActuelle === 'settings' && (
        <PatientSettings token={token} onBack={() => setVueActuelle('dashboard')} />
      )}
    </div>
  );
}

// Composant ListMyConsultations (pour les médecins - MODIFIÉ pour inclure les boutons Mettre à jour/Supprimer)
function ListMyConsultations({ token, onBack, onUpdate }) {
  const [consultations, setConsultations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [message, setMessage] = useState(''); // Pour les messages de suppression
  const [typeMessage, setTypeMessage] = useState('');

  const recupererMesConsultations = async () => {
    try {
      const reponse = await fetch('http://localhost:5001/medecin/my_consultations', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (!reponse.ok) {
        const texteErreur = await reponse.text();
        console.error('Texte de réponse HTTP Erreur (ListMyConsultations) :', texteErreur);
        throw new Error(`Erreur HTTP ! statut : ${reponse.status} - ${texteErreur}`);
      }
      const donnees = await reponse.json();
      setConsultations(donnees);
    } catch (err) {
      console.error('Erreur lors de la récupération de mes consultations :', err);
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    recupererMesConsultations();
  }, [token]);

  const gererSuppression = async (consultationId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette consultation ?')) {
      setMessage('');
      setTypeMessage('');
      try {
        const reponse = await fetch(`http://localhost:5001/medecin/consultations/${consultationId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          },
        });

        const donnees = await reponse.json();

        if (reponse.ok) {
          setMessage(donnees.msg || 'Consultation supprimée avec succès !');
          setTypeMessage('success');
          recupererMesConsultations(); // Re-fetch la liste après suppression
        } else {
          setMessage(donnees.msg || 'Échec de la suppression de la consultation.');
          setTypeMessage('error');
        }
      } catch (erreur) {
        console.error('Erreur lors de la suppression de la consultation :', erreur);
        setMessage('Erreur réseau ou serveur inaccessible.');
        setTypeMessage('error');
      }
    }
  };

  return (
    <div className="mt-8 p-8 bg-teal-50 rounded-lg border border-teal-200 shadow-inner w-full">
      <h3 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Mes Consultations</h3>
      {chargement && <p className="text-center text-teal-700">Chargement des consultations...</p>}
      {erreur && <p className="text-center text-red-600">Erreur : {erreur}</p>}
      {message && (
        <div
          className={`p-4 rounded-lg text-base font-medium mb-4 ${
            typeMessage === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
          }`}
          role="alert"
        >
          {message}
        </div>
      )}
      {!chargement && !erreur && (
        <>
          {consultations.length === 0 ? (
            <p className="text-center text-gray-600">Vous n'avez pas encore de consultations enregistrées.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg shadow-md">
                <thead className="bg-teal-100 border-b border-teal-200">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 rounded-tl-lg">ID</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Patient</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Date & Heure</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Motif</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 rounded-tr-lg">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {consultations.map((consultation) => (
                    <tr key={consultation._id} className="border-b border-gray-200 hover:bg-teal-50">
                      <td className="py-3 px-4 text-sm text-gray-800">{consultation._id.substring(0, 8)}...</td>
                      <td className="py-3 px-4 text-sm text-gray-800">{consultation.patient_nom}</td>
                      <td className="py-3 px-4 text-sm text-gray-800">{new Date(consultation.date_heure).toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-gray-800">{consultation.motif}</td>
                      <td className="py-3 px-4 text-sm text-gray-800 space-x-2 flex">
                        <button
                          onClick={() => onUpdate(consultation._id)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-md transition duration-200 ease-in-out"
                        >
                          Mettre à jour
                        </button>
                        <button
                          onClick={() => gererSuppression(consultation._id)}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md transition duration-200 ease-in-out"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button
            onClick={onBack}
            className="mt-6 py-2 px-4 rounded-lg text-blue-600 border border-blue-300 hover:bg-blue-100 transition duration-300 ease-in-out font-medium"
          >
            Retour au Tableau de Bord
          </button>
        </>
      )}
    </div>
  );
}

// Nouveau Composant : UpdateConsultationForm
function UpdateConsultationForm({ token, consultationId, onBack, onSuccess }) {
  const [idPatient, setIdPatient] = useState('');
  const [dateHeure, setDateHeure] = useState('');
  const [motif, setMotif] = useState('');
  const [patients, setPatients] = useState([]); // Liste des patients pour le menu déroulant
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [message, setMessage] = useState('');
  const [typeMessage, setTypeMessage] = useState('');

  useEffect(() => {
    const recupererDonnees = async () => {
      try {
        // Récupérer les détails de la consultation
        const reponseConsultation = await fetch(`http://localhost:5001/medecin/consultations/${consultationId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!reponseConsultation.ok) throw new Error(`Erreur HTTP ! statut : ${reponseConsultation.status}`);
        const donneesConsultation = await reponseConsultation.json();
        setIdPatient(donneesConsultation.patient_id);
        setDateHeure(new Date(donneesConsultation.date_heure).toISOString().slice(0, 16)); // Format pour datetime-local
        setMotif(donneesConsultation.motif);

        // Récupérer les patients pour le menu déroulant
        const reponsePatients = await fetch('http://localhost:5001/medecin/mes_patients', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!reponsePatients.ok) throw new Error(`Erreur HTTP ! statut : ${reponsePatients.status}`);
        const donneesPatients = await reponsePatients.json();
        setPatients(donneesPatients);

      } catch (err) {
        setErreur(err.message);
      } finally {
        setChargement(false);
      }
    };
    recupererDonnees();
  }, [token, consultationId]);

  const gererSoumission = async (e) => {
    e.preventDefault();
    setMessage('');
    setTypeMessage('');

    if (!idPatient || !dateHeure || !motif) {
      setMessage('Tous les champs sont requis.');
      setTypeMessage('error');
      return;
    }

    try {
      const reponse = await fetch(`http://localhost:5001/medecin/consultations/${consultationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          patient_id: idPatient,
          date_heure: dateHeure,
          motif: motif,
        }),
      });

      const donnees = await reponse.json();

      if (reponse.ok) {
        setMessage(donnees.msg || 'Consultation mise à jour avec succès !');
        setTypeMessage('success');
        onSuccess(); // Appeler le callback de succès pour rafraîchir la liste/le tableau de bord parent
      } else {
        setMessage(donnees.msg || 'Échec de la mise à jour de la consultation.');
        setTypeMessage('error');
      }
    } catch (erreur) {
      console.error('Erreur lors de la mise à jour de la consultation :', erreur);
      setMessage('Erreur réseau ou serveur inaccessible.');
      setTypeMessage('error');
    }
  };

  if (chargement) return <p className="text-center text-blue-700 mt-8">Chargement des données de la consultation...</p>;
  if (erreur) return <p className="text-center text-red-600 mt-8">Erreur lors du chargement de la consultation : {erreur}</p>;

  return (
    <div className="mt-8 p-8 bg-yellow-50 rounded-lg border border-yellow-200 shadow-inner w-full max-w-md mx-auto">
      <h3 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Mettre à jour la Consultation</h3>
      <form onSubmit={gererSoumission} className="space-y-6">
        <div>
          <label htmlFor="update-consultation-patient" className="block text-base font-semibold text-gray-700 mb-1">
            Patient :
          </label>
          <select
            id="update-consultation-patient"
            value={idPatient}
            onChange={(e) => setIdPatient(e.target.value)}
            className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 sm:text-base"
            required
            disabled={patients.length === 0} // Désactiver si aucun patient
          >
            <option value="">-- Sélectionner un Patient --</option>
            {patients.map((p) => (
              <option key={p._id} value={p._id}>
                {p.nom} {p.prenom} (Nom d'utilisateur : {p.username})
              </option>
            ))}
          </select>
          {patients.length === 0 && <p className="text-sm text-gray-500 mt-2">Aucun patient ne vous est assigné.</p>}
        </div>
        <div>
          <label htmlFor="update-consultation-date-heure" className="block text-base font-semibold text-gray-700 mb-1">
            Date et Heure
          </label>
          <input
            type="datetime-local"
            id="update-consultation-date-heure"
            value={dateHeure}
            onChange={(e) => setDateHeure(e.target.value)}
            className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 sm:text-base"
            required
          />
        </div>
        <div>
          <label htmlFor="update-consultation-motif" className="block text-base font-semibold text-gray-700 mb-1">
            Motif
          </label>
          <textarea
            id="update-consultation-motif"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            rows="4"
            className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 sm:text-base"
            placeholder="Entrez le motif de la consultation"
            required
          ></textarea>
        </div>
        {message && (
          <div
            className={`p-4 rounded-lg text-base font-medium ${
              typeMessage === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
            }`}
            role="alert"
          >
            {message}
          </div>
        )}
        <div className="flex justify-between items-center">
          <button
            type="submit"
            className="py-3 px-6 border border-transparent rounded-lg shadow-md text-lg font-semibold text-white bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition duration-300 ease-in-out transform hover:-translate-y-0.5"
          >
            Mettre à jour la Consultation
          </button>
          <button
            onClick={onBack}
            type="button"
            className="py-2 px-4 rounded-lg text-blue-600 border border-blue-300 hover:bg-blue-100 transition duration-300 ease-in-out font-medium"
          >
            Retour au Tableau de Bord
          </button>
        </div>
      </form>
    </div>
  );
}

// Composant DoctorSettings
function DoctorSettings({ token, onBack }) {
  const [ancienMotDePasse, setAncienMotDePasse] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmerNouveauMotDePasse, setConfirmerNouveauMotDePasse] = useState('');
  const [message, setMessage] = useState('');
  const [typeMessage, setTypeMessage] = useState('');

  const gererSoumission = async (e) => {
    e.preventDefault();
    setMessage('');
    setTypeMessage('');

    if (!ancienMotDePasse || !nouveauMotDePasse || !confirmerNouveauMotDePasse) {
      setMessage('Tous les champs sont requis.');
      setTypeMessage('error');
      return;
    }

    if (nouveauMotDePasse !== confirmerNouveauMotDePasse) {
      setMessage('Le nouveau mot de passe et la confirmation ne correspondent pas.');
      setTypeMessage('error');
      return;
    }

    if (nouveauMotDePasse.length < 6) { // Exemple : longueur minimale du mot de passe
      setMessage('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      setTypeMessage('error');
      return;
    }

    try {
      const reponse = await fetch('http://localhost:5001/medecin/change_password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          old_password: ancienMotDePasse,
          new_password: nouveauMotDePasse
        }),
      });

      const donnees = await reponse.json();

      if (reponse.ok) {
        setMessage(donnees.msg || 'Mot de passe changé avec succès !');
        setTypeMessage('success');
        setAncienMotDePasse('');
        setNouveauMotDePasse('');
        setConfirmerNouveauMotDePasse('');
      } else {
        setMessage(donnees.msg || 'Échec du changement de mot de passe. Veuillez vérifier votre ancien mot de passe.');
        setTypeMessage('error');
      }
    } catch (erreur) {
      console.error('Erreur lors du changement de mot de passe :', erreur);
      setMessage('Erreur réseau ou serveur inaccessible.');
      setTypeMessage('error');
    }
  };

  return (
    <div className="mt-8 p-8 bg-gray-50 rounded-lg border border-gray-200 shadow-inner w-full max-w-md mx-auto">
      <h3 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Changer le Mot de Passe</h3>
      <form onSubmit={gererSoumission} className="space-y-6">
        <div>
          <label htmlFor="old-password" className="block text-base font-semibold text-gray-700 mb-1">
            Ancien Mot de Passe
          </label>
          <input
            type="password"
            id="old-password"
            value={ancienMotDePasse}
            onChange={(e) => setAncienMotDePasse(e.target.value)}
            className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 sm:text-base"
            placeholder="Entrez votre ancien mot de passe"
            required
          />
        </div>
        <div>
          <label htmlFor="new-password" className="block text-base font-semibold text-gray-700 mb-1">
            Nouveau Mot de Passe
          </label>
          <input
            type="password"
            id="new-password"
            value={nouveauMotDePasse}
            onChange={(e) => setNouveauMotDePasse(e.target.value)}
            className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 sm:text-base"
            placeholder="Entrez le nouveau mot de passe"
            required
          />
        </div>
        <div>
          <label htmlFor="confirm-new-password" className="block text-base font-semibold text-gray-700 mb-1">
            Confirmer Nouveau Mot de Passe
          </label>
          <input
            type="password"
            id="confirm-new-password"
            value={confirmerNouveauMotDePasse}
            onChange={(e) => setConfirmerNouveauMotDePasse(e.target.value)}
            className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 sm:text-base"
            placeholder="Confirmez le nouveau mot de passe"
            required
          />
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg text-base font-medium ${
              typeMessage === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
            }`}
            role="alert"
          >
            {message}
          </div>
        )}
        <div className="flex justify-between items-center">
          <button
            type="submit"
            className="py-3 px-6 border border-transparent rounded-lg shadow-md text-lg font-semibold text-white bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-300 ease-in-out transform hover:-translate-y-0.5"
          >
            Changer le Mot de Passe
          </button>
          <button
            onClick={onBack}
            type="button"
            className="py-2 px-4 rounded-lg text-blue-600 border border-blue-300 hover:bg-blue-100 transition duration-300 ease-in-out font-medium"
          >
            Retour au Tableau de Bord
          </button>
        </div>
      </form>
    </div>
  );
}

// Composant ListMyConsultationsPatient (pour les patients)
function ListMyConsultationsPatient({ token, onBack }) {
  const [consultations, setConsultations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    const recupererMesConsultations = async () => {
      try {
        const reponse = await fetch('http://localhost:5001/patient/historique_consultations', {
          headers: {
            'Authorization': `Bearer ${token}`
          },
        });

        if (!reponse.ok) {
          const texteErreur = await reponse.text();
          console.error('Texte de réponse HTTP Erreur (ListMyConsultationsPatient) :', texteErreur);
          throw new Error(`Erreur HTTP ! statut : ${reponse.status} - ${texteErreur}`);
        }
        const donnees = await reponse.json();
        console.log('Données brutes reçues de /patient/historique_consultations :', donnees);
        setConsultations(donnees);
      } catch (err) {
        console.error('Erreur lors de la récupération des consultations du patient :', err);
        setErreur(err.message);
      } finally {
        setChargement(false);
      }
    };

    recupererMesConsultations();
  }, [token]);

  useEffect(() => {
    console.log('État actuel des consultations (après définition, ListMyConsultationsPatient) :', consultations);
  }, [consultations]);

  return (
    <div className="mt-8 p-8 bg-teal-50 rounded-lg border border-teal-200 shadow-inner w-full">
      <h3 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Mes Consultations</h3>
      {chargement && <p className="text-center text-teal-700">Chargement des consultations...</p>}
      {erreur && <p className="text-center text-red-600">Erreur : {erreur}</p>}
      {!chargement && !erreur && (
        <>
          {consultations.length === 0 ? (
            <p className="text-center text-gray-600">Vous n'avez pas encore de consultations enregistrées.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg shadow-md">
                <thead className="bg-teal-100 border-b border-teal-200">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 rounded-tl-lg">ID</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Médecin</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Date & Heure</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 rounded-tr-lg">Motif</th>
                  </tr>
                </thead>
                <tbody>
                  {consultations.map((consultation) => (
                    <tr key={consultation._id} className="border-b border-gray-200 hover:bg-teal-50">
                      <td className="py-3 px-4 text-sm text-gray-800">{consultation._id.substring(0, 8)}...</td>
                      <td className="py-3 px-4 text-sm text-gray-800">{consultation.medecin_nom}</td>
                      <td className="py-3 px-4 text-sm text-gray-800">{new Date(consultation.date_heure).toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-gray-800">{consultation.motif}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button
            onClick={onBack}
            type="button"
            className="mt-6 py-2 px-4 rounded-lg text-blue-600 border border-blue-300 hover:bg-blue-100 transition duration-300 ease-in-out font-medium"
          >
            Retour au Tableau de Bord
          </button>
        </>
      )}
    </div>
  );
}

// Composant PatientSettings
function PatientSettings({ token, onBack }) {
  const [ancienMotDePasse, setAncienMotDePasse] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmerNouveauMotDePasse, setConfirmerNouveauMotDePasse] = useState('');
  const [message, setMessage] = useState('');
  const [typeMessage, setTypeMessage] = useState('');

  const gererSoumission = async (e) => {
    e.preventDefault();
    setMessage('');
    setTypeMessage('');

    if (!ancienMotDePasse || !nouveauMotDePasse || !confirmerNouveauMotDePasse) {
      setMessage('Tous les champs sont requis.');
      setTypeMessage('error');
      return;
    }

    if (nouveauMotDePasse !== confirmerNouveauMotDePasse) {
      setMessage('Le nouveau mot de passe et la confirmation ne correspondent pas.');
      setTypeMessage('error');
      return;
    }

    if (nouveauMotDePasse.length < 6) { // Exemple : longueur minimale du mot de passe
      setMessage('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      setTypeMessage('error');
      return;
    }

    try {
      const reponse = await fetch('http://localhost:5001/patient/change_password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          old_password: ancienMotDePasse,
          new_password: nouveauMotDePasse
        }),
      });

      const donnees = await reponse.json();

      if (reponse.ok) {
        setMessage(donnees.msg || 'Mot de passe changé avec succès !');
        setTypeMessage('success');
        setAncienMotDePasse('');
        setNouveauMotDePasse('');
        setConfirmerNouveauMotDePasse('');
      } else {
        setMessage(donnees.msg || 'Échec du changement de mot de passe. Veuillez vérifier votre ancien mot de passe.');
        setTypeMessage('error');
      }
    } catch (erreur) {
      console.error('Erreur lors du changement de mot de passe :', erreur);
      setMessage('Erreur réseau ou serveur inaccessible.');
      setTypeMessage('error');
    }
  };

  return (
    <div className="mt-8 p-8 bg-gray-50 rounded-lg border border-gray-200 shadow-inner w-full max-w-md mx-auto">
      <h3 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Changer le Mot de Passe</h3>
      <form onSubmit={gererSoumission} className="space-y-6">
        <div>
          <label htmlFor="patient-old-password" className="block text-base font-semibold text-gray-700 mb-1">
            Ancien Mot de Passe
          </label>
          <input
            type="password"
            id="patient-old-password"
            value={ancienMotDePasse}
            onChange={(e) => setAncienMotDePasse(e.target.value)}
            className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 sm:text-base"
            placeholder="Entrez votre ancien mot de passe"
            required
          />
        </div>
        <div>
          <label htmlFor="patient-new-password" className="block text-base font-semibold text-gray-700 mb-1">
            Nouveau Mot de Passe
          </label>
          <input
            type="password"
            id="patient-new-password"
            value={nouveauMotDePasse}
            onChange={(e) => setNouveauMotDePasse(e.target.value)}
            className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 sm:text-base"
            placeholder="Entrez le nouveau mot de passe"
            required
          />
        </div>
        <div>
          <label htmlFor="patient-confirm-new-password" className="block text-base font-semibold text-gray-700 mb-1">
            Confirmer Nouveau Mot de Passe
          </label>
          <input
            type="password"
            id="patient-confirm-new-password"
            value={confirmerNouveauMotDePasse}
            onChange={(e) => setConfirmerNouveauMotDePasse(e.target.value)}
            className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 sm:text-base"
            placeholder="Confirmez le nouveau mot de passe"
            required
          />
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg text-base font-medium ${
              typeMessage === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
            }`}
            role="alert"
          >
            {message}
          </div>
        )}
        <div className="flex justify-between items-center">
          <button
            type="submit"
            className="py-3 px-6 border border-transparent rounded-lg shadow-md text-lg font-semibold text-white bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-300 ease-in-out transform hover:-translate-y-0.5"
          >
            Changer le Mot de Passe
          </button>
          <button
            onClick={onBack}
            type="button"
            className="py-2 px-4 rounded-lg text-blue-600 border border-blue-300 hover:bg-blue-100 transition duration-300 ease-in-out font-medium"
          >
            Retour au Tableau de Bord
          </button>
        </div>
      </form>
    </div>
  );
}
