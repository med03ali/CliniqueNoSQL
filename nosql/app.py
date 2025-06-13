# # app.py


from flask import Flask, request, jsonify
from database.mongo_db import MongoDB
from synchronization.sync_manager import SyncManager
from bson.objectid import ObjectId

from flask_jwt_extended import create_access_token, jwt_required, JWTManager, get_jwt_identity
from flask_cors import CORS # Import CORS

app = Flask(__name__)

# --- Configuration CORS ---
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

# --- Configuration JWT ---
app.config["JWT_SECRET_KEY"] = "super-secret-key-change-this"
jwt = JWTManager(app)

mongo_db = MongoDB()
sync_manager = SyncManager()

# --- Helpers ---
def mongo_to_json(data):
    """Converts MongoDB ObjectIds to strings for JSON response."""
    if isinstance(data, list):
        return [{k: str(v) if isinstance(v, ObjectId) else v for k, v in item.items()} for item in data]
    elif isinstance(data, dict):
        return {k: str(v) if isinstance(v, ObjectId) else v for k, v in data.items()}
    return data

def get_current_entity_and_role():
    """
    Determines the ID of the currently logged-in entity, its role, and the entity document.
    Returns (entity_id_str, role, entity_document).
    """
    current_jwt_id = get_jwt_identity()
    if not current_jwt_id:
        return None, None, None

    try:
        # Tries to find the ID in the 'users' collection (for admins)
        user_doc = mongo_db.find_document("users", {"_id": ObjectId(current_jwt_id)})
        if user_doc and user_doc.get('role') == "admin":
            return current_jwt_id, "admin", user_doc

        # Tries to find the ID in the 'medecins' collection
        medecin_doc = mongo_db.find_document("medecins", {"_id": ObjectId(current_jwt_id)})
        if medecin_doc and medecin_doc.get('username') and medecin_doc.get('password'):
            return current_jwt_id, "medecin", medecin_doc

        # Tries to find the ID in the 'patients' collection
        patient_doc = mongo_db.find_document("patients", {"_id": ObjectId(current_jwt_id)})
        if patient_doc and patient_doc.get('username') and patient_doc.get('password'):
            return current_jwt_id, "patient", patient_doc
    except Exception as e:
        print(f"Erreur lors de la conversion de l'ID JWT : {e}")
        return None, None, None
    
    return None, None, None

# --- Authentification Routes ---
@app.route("/register", methods=["POST"])
def register():
    """
    Registers a new user. This route is now strictly for admins.
    Doctors and patients are created via the /admin/medecins and /admin/patients routes.
    """
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    role = data.get("role")
    entite_id = data.get("entite_id")

    if not username or not password or not role:
        return jsonify({"msg": "Nom d'utilisateur, mot de passe et role requis"}), 400
    
    # New logic: Only "admin" roles can register here
    if role != "admin":
        return jsonify({"msg": "Seuls les utilisateurs avec le role 'admin' peuvent etre enregistres via cette route."}), 400

    if mongo_db.find_user_by_username(username):
        return jsonify({"msg": "Nom d'utilisateur deja pris"}), 409

    # WARNING: Password stored in clear - MAJOR SECURITY RISK!
    user_data = {
        "username": username,
        "password": password, 
        "role": role,
        "entite_id": entite_id 
    }
    user_id = mongo_db.add_user(user_data)

    if user_id:
        sync_manager.sync_user_creation(user_id, user_data)
        return jsonify({"msg": "Utilisateur enregistre avec succes", "user_id": user_id}), 201
    return jsonify({"msg": "Erreur lors de l'enregistrement de l'utilisateur"}), 500

@app.route("/login", methods=["POST"])
def login():
    """Login for 'admin' users."""
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    user = mongo_db.find_user_by_username(username)
    # Clear password verification - MAJOR SECURITY RISK!
    # Ensures only an "admin" user can log in via this route
    if user and user.get("password") == password and user.get("role") == "admin": 
        access_token = create_access_token(identity=str(user["_id"]))
        return jsonify(access_token=access_token), 200
    return jsonify({"msg": "Mauvais nom d'utilisateur ou mot de passe"}), 401

@app.route("/login/medecin", methods=["POST"])
def login_as_medecin():
    """Login for 'medecin' entities."""
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    
    medecin = mongo_db.find_medecin_by_username(username)
    
    # Clear password verification - MAJOR SECURITY RISK!
    if medecin and medecin.get("password") == password: 
        # The JWT identity is the ObjectId of the 'medecin' document
        access_token = create_access_token(identity=str(medecin["_id"]))
        return jsonify(access_token=access_token), 200
    return jsonify({"msg": "Mauvais nom d'utilisateur ou mot de passe"}), 401

@app.route("/login/patient", methods=["POST"])
def login_as_patient():
    """Login for 'patient' entities."""
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    
    patient = mongo_db.find_patient_by_username(username)
    
    # Clear password verification - MAJOR SECURITY RISK!
    if patient and patient.get("password") == password: 
        # The JWT identity is the ObjectId of the 'patient' document
        access_token = create_access_token(identity=str(patient["_id"]))
        return jsonify(access_token=access_token), 200
    return jsonify({"msg": "Mauvais nom d'utilisateur ou mot de passe"}), 401


# --- Admin Routes : Patient Management ---
@app.route("/admin/patients", methods=["POST"])
@jwt_required()
def create_patient():
    """
    Creates a new patient and associates a username/password for direct login.
    Only an admin can perform this action.
    """
    current_entity_id, role, entity_doc = get_current_entity_and_role()
    if role != "admin":
        return jsonify({"msg": "Acces non autorise"}), 403

    request_data = request.get_json() 
    if not all(k in request_data for k in ["nom", "prenom"]):
        return jsonify({"msg": "Nom et prenom sont requis"}), 400

    # Generates username and password for the patient
    patient_username = f"{request_data['nom'].lower()}_{request_data['prenom'].lower()}_patient"
    patient_password = "password123" # WARNING: Clear password - SECURITY RISK!

    # Adds username and password directly to the patient data dictionary.
    request_data['username'] = patient_username
    request_data['password'] = patient_password

    # Checks if the generated username already exists IN THE PATIENT COLLECTION
    if mongo_db.find_patient_by_username(patient_username):
        return jsonify({
            "msg": f"Nom d'utilisateur '{patient_username}' deja pris pour un patient. Veuillez utiliser un autre nom ou prenom."
        }), 409

    patient_id = mongo_db.add_patient(request_data) 
    if patient_id:
        sync_manager.sync_patient_creation(patient_id, request_data) 
        return jsonify({"msg": "Patient ajoute avec succes", "id": patient_id}), 201
            
    return jsonify({"msg": "Erreur lors de l'ajout du patient"}), 500

@app.route("/admin/patients", methods=["GET"])
@jwt_required()
def get_patients():
    """Retrieves all patients. Only an admin can perform this action."""
    current_entity_id, role, entity_doc = get_current_entity_and_role()
    if role != "admin":
        return jsonify({"msg": "Acces non autorise"}), 403
    patients = mongo_db.get_all_patients()
    return jsonify(mongo_to_json(patients)), 200

@app.route("/admin/patients/<string:patient_id>", methods=["GET"])
@jwt_required()
def get_patient(patient_id):
    """Retrieves a patient by ID. Only an admin can perform this action."""
    current_entity_id, role, entity_doc = get_current_entity_and_role()
    if role != "admin":
        return jsonify({"msg": "Acces non autorise"}), 403
    patient = mongo_db.get_patient(patient_id)
    if patient:
        return jsonify(mongo_to_json(patient)), 200
    return jsonify({"msg": "Patient non trouve"}), 404

@app.route("/admin/patients/<string:patient_id>", methods=["PUT"])
@jwt_required()
def update_patient(patient_id):
    """Updates a patient's information. Only an admin can perform this action."""
    current_entity_id, role, entity_doc = get_current_entity_and_role()
    if role != "admin":
        return jsonify({"msg": "Acces non autorise"}), 403
    data = request.get_json()
    if mongo_db.update_patient(patient_id, data):
        sync_manager.sync_patient_update(patient_id, data)
        return jsonify({"msg": "Patient mis a jour avec succes"}), 200
    return jsonify({"msg": "Patient non trouve ou aucune modification"}), 404

@app.route("/admin/patients/<string:patient_id>", methods=["DELETE"])
@jwt_required()
def delete_patient(patient_id):
    """Deletes a patient. Only an admin can perform this action."""
    current_entity_id, role, entity_doc = get_current_entity_and_role()
    if role != "admin":
        return jsonify({"msg": "Acces non autorise"}), 403
    if mongo_db.delete_patient(patient_id):
        sync_manager.sync_patient_deletion(patient_id)
        return jsonify({"msg": "Patient supprime avec succes"}), 200
    return jsonify({"msg": "Patient non trouve"}), 404

@app.route("/admin/patients/<string:patient_id>/assign_medecin/<string:medecin_id>", methods=["POST"])
@jwt_required()
def assign_medecin_traitant(patient_id, medecin_id):
    """Assigns a treating physician to a patient (creates a relationship in Neo4j). Only an admin can perform this action."""
    current_entity_id, role, entity_doc = get_current_entity_and_role()
    if role != "admin":
        return jsonify({"msg": "Acces non autorise"}), 403
    
    # Check if patient and physician exist in MongoDB
    patient_exists = mongo_db.get_patient(patient_id)
    medecin_exists = mongo_db.get_medecin(medecin_id)
    if not patient_exists or not medecin_exists:
        return jsonify({"msg": "Patient ou medecin non trouve"}), 404

    try:
        sync_manager.neo4j_db.link_patient_to_medecin_traitant(patient_id, medecin_id)
        return jsonify({"msg": "Medecin traitant assigne avec succes"}), 200
    except Exception as e:
        return jsonify({"msg": f"Erreur lors de l'assignation du medecin traitant: {e}"}), 500

# --- Admin Routes : Doctor Management ---
@app.route("/admin/medecins", methods=["POST"])
@jwt_required()
def create_medecin():
    """
    Creates a new doctor and associates a username/password for direct login.
    Only an admin can perform this action.
    """
    current_entity_id, role, entity_doc = get_current_entity_and_role()
    if role != "admin":
        return jsonify({"msg": "Acces non autorise"}), 403

    data = request.get_json()
    if not all(k in data for k in ["nom", "prenom", "specialite"]):
        return jsonify({"msg": "Nom, prenom et specialite sont requis"}), 400
    
    medecin_username = f"{data['nom'].lower()}.{data['prenom'].lower()}_medecin"
    medecin_password = "password123" # WARNING: Clear password - SECURITY RISK!
    
    data['username'] = medecin_username
    data['password'] = medecin_password

    # Checks if the generated username already exists IN THE DOCTOR COLLECTION
    if mongo_db.find_medecin_by_username(medecin_username):
        return jsonify({
            "msg": f"Nom d'utilisateur '{medecin_username}' deja pris pour un medecin. Veuillez utiliser un autre nom ou prenom."
        }), 409

    medecin_id = mongo_db.add_medecin(data)
    if medecin_id:
        sync_manager.sync_medecin_creation(medecin_id, data)
        return jsonify({"msg": "Medecin ajoute avec succes", "id": medecin_id}), 201
            
    return jsonify({"msg": "Erreur lors de l'ajout du medecin"}), 500

@app.route("/admin/medecins", methods=["GET"])
@jwt_required()
def get_medecins():
    """Retrieves all doctors. Only an admin can perform this action."""
    current_entity_id, role, entity_doc = get_current_entity_and_role()
    if role != "admin":
        return jsonify({"msg": "Acces non autorise"}), 403
    medecins = mongo_db.get_all_medecins()
    return jsonify(mongo_to_json(medecins)), 200

@app.route("/admin/medecins/<string:medecin_id>", methods=["GET"])
@jwt_required()
def get_medecin(medecin_id):
    """Retrieves a doctor by ID. Only an admin can perform this action."""
    current_entity_id, role, entity_doc = get_current_entity_and_role()
    if role != "admin":
        return jsonify({"msg": "Acces non autorise"}), 403
    medecin = mongo_db.get_medecin(medecin_id)
    if medecin:
        return jsonify(mongo_to_json(medecin)), 200
    return jsonify({"msg": "Medecin non trouve"}), 404

@app.route("/admin/medecins/<string:medecin_id>", methods=["PUT"])
@jwt_required()
def update_medecin(medecin_id):
    """Updates a doctor's information. Only an admin can perform this action."""
    current_entity_id, role, entity_doc = get_current_entity_and_role()
    if role != "admin":
        return jsonify({"msg": "Acces non autorise"}), 403
    data = request.get_json()
    if mongo_db.update_medecin(medecin_id, data):
        sync_manager.sync_medecin_update(medecin_id, data)
        return jsonify({"msg": "Medecin mis a jour avec succes"}), 200
    return jsonify({"msg": "Medecin non trouve ou aucune modification"}), 404

@app.route("/admin/medecins/<string:medecin_id>", methods=["DELETE"])
@jwt_required()
def delete_medecin(medecin_id):
    """Deletes a doctor. Only an admin can perform this action."""
    current_entity_id, role, entity_doc = get_current_entity_and_role()
    if role != "admin":
        return jsonify({"msg": "Acces non autorise"}), 403
    if mongo_db.delete_medecin(medecin_id):
        sync_manager.sync_medecin_deletion(medecin_id)
        return jsonify({"msg": "Medecin supprime avec succes"}), 200
    return jsonify({"msg": "Medecin non trouve"}), 404

# --- Doctor Routes : Consultation Management ---
@app.route("/medecin/consultations", methods=["POST"])
@jwt_required()
def create_consultation():
    """
    Creates a new consultation. Only a doctor can perform this action.
    Ensures Neo4j relationships are established between the consultation, patient, and doctor.
    This is a DEBUG version that directly calls Neo4j functions.
    """
    current_entity_id, role, medecin_doc = get_current_entity_and_role()
    if role != "medecin":
        return jsonify({"msg": "Acces non autorise"}), 403

    data = request.get_json()
    if not all(k in data for k in ["patient_id", "date_heure", "motif"]):
        return jsonify({"msg": "ID patient, date, heure et motif sont requis"}), 400

    data["medecin_id"] = current_entity_id 

    consultation_id = mongo_db.add_consultation(data)
    if consultation_id:
        try:
            # Direct call to create the Consultation node in Neo4j
            sync_manager.neo4j_db.create_consultation_node(
                consultation_id,
                data.get("date_heure"),
                data.get("motif")
            )

            # Direct call to link the patient to the consultation
            patient_id_str = data.get("patient_id")
            sync_manager.neo4j_db.link_patient_consultation(
                patient_id_str,
                consultation_id
            )

            # Direct call to link the consultation to the doctor
            medecin_id_str = data.get("medecin_id")
            sync_manager.neo4j_db.link_consultation_medecin(
                consultation_id,
                medecin_id_str
            )
        except Exception as e:
            return jsonify({"msg": f"Erreur lors de la synchronisation Neo4j: {e}"}), 500

        return jsonify({"msg": "Consultation ajoutee avec succes ", "id": consultation_id}), 201
    return jsonify({"msg": "Erreur lors de l'ajout de la consultation"}), 500

@app.route("/medecin/my_consultations", methods=["GET", "OPTIONS"]) # Add OPTIONS method
@jwt_required(optional=True) # Make JWT optional for OPTIONS, then check manually
def get_medecin_consultations():
    if request.method == "OPTIONS":
        # Respond to preflight request
        response = jsonify({'msg': 'Preflight success'})
        # Ensure proper CORS headers for OPTIONS (Flask-CORS usually handles this)
        # response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        # response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        # response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        return response, 200

    # For the actual GET request, proceed with JWT validation
    current_entity_id, role, medecin_doc = get_current_entity_and_role()

    if role != "medecin":
        return jsonify({"msg": "Accès non autorisé. Seul un médecin peut accéder à ses consultations."}), 403

    medecin_id = current_entity_id
    consultations = mongo_db.get_consultations_by_medecin(medecin_id)

    enriched_consultations = []
    for consult in consultations:
        patient = mongo_db.get_patient(consult["patient_id"])
        consult_data = mongo_to_json(consult)
        consult_data["patient_nom"] = f"{patient.get('prenom', '')} {patient.get('nom', '')}" if patient else "Patient Inconnu"
        enriched_consultations.append(consult_data)

    return jsonify(enriched_consultations), 200


@app.route("/medecin/consultations/<string:consultation_id>", methods=["PUT"])
@jwt_required()
def update_consultation(consultation_id):
    """Updates an existing consultation. Only a doctor can perform this action."""
    current_entity_id, role, medecin_doc = get_current_entity_and_role()
    if role != "medecin":
        return jsonify({"msg": "Acces non autorise"}), 403

    data = request.get_json()
    
    consultation = mongo_db.get_consultation(consultation_id)
    # Checks that the connected doctor is indeed the one managing this consultation
    # Compares the consultation's doctor ID (which is a string because ObjectId was converted)
    # with the current entity's ID (also a string).
    if not consultation or str(consultation.get("medecin_id")) != current_entity_id:
        return jsonify({"msg": "Consultation non trouvee ou acces non autorise"}), 403

    if mongo_db.update_consultation(consultation_id, data):
        # IMPORTANT NOTE: The call to sync_consultation_creation here might recreate links
        # or nodes if the Neo4j logic is not idempotent for updates.
        # Ideally, for an update, SyncManager should have a dedicated method
        # like `sync_consultation_update` that updates existing Neo4j node properties
        # and doesn't affect relationships if they haven't changed.
        sync_manager.sync_consultation_creation(consultation_id, data) 
        return jsonify({"msg": "Consultation mise a jour avec succes"}), 200
    return jsonify({"msg": "Consultation non trouvee ou aucune modification"}), 404

@app.route("/medecin/consultations/<string:consultation_id>", methods=["DELETE"])
@jwt_required()
def delete_consultation(consultation_id):
    """Deletes a consultation. Only a doctor can perform this action."""
    current_entity_id, role, medecin_doc = get_current_entity_and_role()
    if role != "medecin":
        return jsonify({"msg": "Acces non autorise"}), 403

    consultation = mongo_db.get_consultation(consultation_id)
    # Checks that the connected doctor is indeed the one managing this consultation
    if not consultation or str(consultation.get("medecin_id")) != current_entity_id:
        return jsonify({"msg": "Consultation non trouvee ou acces non autorise"}), 403

    if mongo_db.delete_consultation(consultation_id):
        sync_manager.sync_consultation_deletion(consultation_id)
        return jsonify({"msg": "Consultation supprimee avec succes"}), 200
    return jsonify({"msg": "Consultation non trouvee"}), 404

# @app.route("/medecin/mes_patients", methods=["GET"])
# @jwt_required()
# def get_my_patients():
#     """Retrieves the list of patients treated by the connected doctor."""
#     current_entity_id, role, medecin_doc = get_current_entity_and_role()
#     if role != "medecin":
#         return jsonify({"msg": "Acces non autorise"}), 403

#     medecin_id = current_entity_id 
    
#     # Finds all patients who have had a consultation with this doctor
#     consultations = mongo_db.get_consultations_by_medecin(medecin_id)
#     patient_ids = {c["patient_id"] for c in consultations}

#     patients_info = []
#     for p_id in patient_ids:
#         patient = mongo_db.get_patient(p_id)
#         if patient:
#             patients_info.append(mongo_to_json(patient))
#     return jsonify(patients_info), 200

@app.route("/medecin/mes_patients", methods=["GET"])
@jwt_required()
def get_my_patients():
    """
    Récupère la liste des patients traités par le médecin connecté,
    incluant ceux ayant eu une consultation et ceux qui lui sont assignés.
    """
    current_entity_id, role, medecin_doc = get_current_entity_and_role()
    if role != "medecin":
        return jsonify({"msg": "Acces non autorise"}), 403

    medecin_id = current_entity_id # L'ID du médecin est directement le current_entity_id
    
    # 1. Récupérer les IDs des patients ayant eu une consultation avec ce médecin
    consultations = mongo_db.get_consultations_by_medecin(medecin_id)
    patient_ids_from_consultations = {c["patient_id"] for c in consultations} # Utilise un set pour éviter les doublons d'IDs

    # 2. Récupérer les IDs des patients assignés à ce médecin via Neo4j
    # Assurez-vous que sync_manager.neo4j_db est correctement initialisé et accessible
    assigned_patient_ids = sync_manager.neo4j_db.get_patients_assigned_to_medecin(medecin_id)
    patient_ids_from_assignments = set(assigned_patient_ids) # Convertir en set

    # 3. Combiner tous les IDs uniques de patients
    all_unique_patient_ids = patient_ids_from_consultations.union(patient_ids_from_assignments)

    # 4. Récupérer les informations complètes de ces patients depuis MongoDB
    patients_info = []
    for p_id in all_unique_patient_ids:
        patient = mongo_db.get_patient(p_id)
        if patient:
            patients_info.append(mongo_to_json(patient))
            
    return jsonify(patients_info), 200


@app.route("/patient/historique_consultations", methods=["GET", "OPTIONS"]) # Add OPTIONS here
@jwt_required(optional=True) # Make JWT optional to allow OPTIONS preflight
def get_patient_history():
    """
    Retrieves the consultation history for the connected patient.
    Only a patient can perform this action.
    """
    # Handle the OPTIONS preflight request first
    if request.method == "OPTIONS":
        # The browser sends OPTIONS without auth headers.
        # Just return a 200 OK with necessary CORS headers (Flask-CORS should handle most of it).
        return jsonify({'message': 'Preflight request successful'}), 200

    # For the actual GET request, proceed with JWT validation and logic
    current_entity_id, role, patient_doc = get_current_entity_and_role()

    if role != "patient":
        return jsonify({"msg": "Accès non autorisé"}), 403

    patient_id = current_entity_id
    consultations = mongo_db.get_consultations_by_patient(patient_id)
    
    # Enriches consultations with doctor names
    enriched_consultations = []
    for consult in consultations:
        medecin = mongo_db.get_medecin(consult["medecin_id"])
        consult_data = mongo_to_json(consult)
        consult_data["medecin_nom"] = f"{medecin.get('prenom', '')} {medecin.get('nom', '')}" if medecin else "Inconnu"
        enriched_consultations.append(consult_data)
        
    return jsonify(enriched_consultations), 200




@app.route("/patient/change_password", methods=["PUT"])
@jwt_required()
def change_patient_password():
    """
    Permet au patient connecté de modifier son propre mot de passe.
    """
    current_entity_id, role, patient_doc = get_current_entity_and_role()

    # Vérifie que l'utilisateur est bien un patient
    if role != "patient":
        return jsonify({"msg": "Acces non autorise. Seul un patient peut modifier son mot de passe via cette route."}), 403

    data = request.get_json()
    new_password = data.get("new_password")

    if not new_password:
        return jsonify({"msg": "Nouveau mot de passe requis"}), 400

    # WARNING: Mot de passe stocke en clair - RISQUE DE SECURITE MAJEUR !
    # Dans une application de production, vous DEVEZ hacher le mot de passe
    # avant de le stocker. Exemple avec Flask-Bcrypt:
    # hashed_password = bcrypt.generate_password_hash(new_password).decode('utf-8')
    # update_data = {"password": hashed_password}

    update_data = {"password": new_password} # Pour l'instant, stockage en clair comme le reste du projet

    if mongo_db.update_patient(current_entity_id, update_data):
        return jsonify({"msg": "Mot de passe mis a jour avec succes"}), 200
    
    return jsonify({"msg": "Erreur lors de la mise a jour du mot de passe ou patient non trouve."}), 500

# Ajoutez cette fonction après les routes existantes du médecin, par exemple après `/medecin/mes_patients`.
@app.route("/medecin/change_password", methods=["PUT"])
@jwt_required()
def change_medecin_password():
    """
    Permet au médecin connecté de modifier son propre mot de passe.
    """
    current_entity_id, role, medecin_doc = get_current_entity_and_role()

    # Vérifie que l'utilisateur est bien un médecin
    if role != "medecin":
        return jsonify({"msg": "Acces non autorise. Seul un medecin peut modifier son mot de passe via cette route."}), 403

    data = request.get_json()
    new_password = data.get("new_password")

    if not new_password:
        return jsonify({"msg": "Nouveau mot de passe requis"}), 400

    # WARNING: Mot de passe stocke en clair - RISQUE DE SECURITE MAJEUR !
    # Dans une application de production, vous DEVEZ hacher le mot de passe
    # avant de le stocker. Exemple avec Flask-Bcrypt:
    # hashed_password = bcrypt.generate_password_hash(new_password).decode('utf-8')
    # update_data = {"password": hashed_password}

    update_data = {"password": new_password} # Pour l'instant, stockage en clair comme le reste du projet

    if mongo_db.update_medecin(current_entity_id, update_data):
        return jsonify({"msg": "Mot de passe mis a jour avec succes"}), 200
    
    return jsonify({"msg": "Erreur lors de la mise a jour du mot de passe ou medecin non trouve."}), 500


if __name__ == "__main__":
    print("Demarrage de l'API Flask...")
    app.run(debug=True, port=5001)# --- Patient Routes : Consultation History ---
