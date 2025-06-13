from database.mongo_db import MongoDB
from database.neo4j_db import Neo4jDB

class SyncManager:
    def __init__(self):
        self.mongo_db = MongoDB()
        self.neo4j_db = Neo4jDB()

    # --- Patient Synchronization ---
    def sync_patient_creation(self, mongo_patient_id, patient_data):
        """Creates a patient node in Neo4j."""
        try:
            self.neo4j_db.create_patient_node(
                mongo_patient_id,
                patient_data.get("nom"),
                patient_data.get("prenom"),
                patient_data.get("date_naissance")
            )
            print(f"Sync: Patient {mongo_patient_id} cree dans Neo4j.")
        except Exception as e:
            print(f"Erreur de synchronisation patient (Neo4j): {e}")

    def sync_patient_update(self, mongo_patient_id, new_data):
        """Updates a patient node in Neo4j."""
        try:
            neo4j_update_data = {k: v for k, v in new_data.items() if k in ["nom", "prenom", "date_naissance"]}
            if neo4j_update_data:
                self.neo4j_db.update_patient_node(mongo_patient_id, neo4j_update_data)
                print(f"Sync: Patient {mongo_patient_id} mis a jour dans Neo4j.")
        except Exception as e:
            print(f"Erreur de synchronisation patient (update Neo4j): {e}")

    def sync_patient_deletion(self, mongo_patient_id):
        """Deletes a patient node from Neo4j."""
        try:
            self.neo4j_db.delete_patient_node(mongo_patient_id)
            print(f"Sync: Patient {mongo_patient_id} supprime de Neo4j.")
        except Exception as e:
            print(f"Erreur de synchronisation patient (delete Neo4j): {e}")

    # --- Doctor Synchronization ---
    def sync_medecin_creation(self, mongo_medecin_id, medecin_data):
        """Creates a doctor node in Neo4j."""
        try:
            self.neo4j_db.create_medecin_node(
                mongo_medecin_id,
                medecin_data.get("nom"),
                medecin_data.get("prenom"),
                medecin_data.get("specialite")
            )
            print(f"Sync: Medecin {mongo_medecin_id} cree dans Neo4j.")
        except Exception as e:
            print(f"Erreur de synchronisation medecin (Neo4j): {e}")

    def sync_medecin_update(self, mongo_medecin_id, new_data):
        """Updates a doctor node in Neo4j."""
        try:
            neo4j_update_data = {k: v for k, v in new_data.items() if k in ["nom", "prenom", "specialite"]}
            if neo4j_update_data:
                self.neo4j_db.update_medecin_node(mongo_medecin_id, neo4j_update_data)
                print(f"Sync: Medecin {mongo_medecin_id} mis a jour dans Neo4j.")
        except Exception as e:
            print(f"Erreur de synchronisation medecin (update Neo4j): {e}")

    def sync_medecin_deletion(self, mongo_medecin_id):
        """Deletes a doctor node from Neo4j."""
        try:
            self.neo4j_db.delete_medecin_node(mongo_medecin_id)
            print(f"Sync: Medecin {mongo_medecin_id} supprime de Neo4j.")
        except Exception as e:
            print(f"Erreur de synchronisation medecin (delete Neo4j): {e}")

    # --- Consultation Synchronization ---
    def sync_consultation_creation(self, mongo_consultation_id, consultation_data):
        """Creates a consultation node and links it to patient and doctor in Neo4j."""
        try:
            self.neo4j_db.create_consultation_node(
                mongo_consultation_id,
                consultation_data.get("date_heure"),
                consultation_data.get("motif")
            )
            self.neo4j_db.link_patient_consultation(
                consultation_data.get("patient_id"),
                mongo_consultation_id
            )
            self.neo4j_db.link_consultation_medecin(
                mongo_consultation_id,
                consultation_data.get("medecin_id")
            )
            print(f"Sync: Consultation {mongo_consultation_id} creee et liee dans Neo4j.")
        except Exception as e:
            print(f"Erreur de synchronisation consultation (Neo4j): {e}")

    def sync_consultation_deletion(self, mongo_consultation_id):
        """Deletes a consultation node from Neo4j."""
        try:
            self.neo4j_db.delete_consultation_node(mongo_consultation_id)
            print(f"Sync: Consultation {mongo_consultation_id} supprimee de Neo4j.")
        except Exception as e:
            print(f"Erreur de synchronisation consultation (delete Neo4j): {e}")

    # --- User Synchronization ---
    def sync_user_creation(self, mongo_user_id, user_data):
        """Creates a user node and links it to an entity (patient/doctor) in Neo4j."""
        try:
            self.neo4j_db.create_user_node(
                mongo_user_id,
                user_data.get("username"),
                user_data.get("role")
            )
            if user_data.get("entite_id") and user_data.get("role") in ["patient", "medecin"]:
                entity_type = "Patient" if user_data.get("role") == "patient" else "Medecin"
                self.neo4j_db.link_user_to_entity(mongo_user_id, entity_type, user_data.get("entite_id"))
            print(f"Sync: Utilisateur {mongo_user_id} cree dans Neo4j.")
        except Exception as e:
            print(f"Erreur de synchronisation utilisateur (Neo4j): {e}")

    def sync_user_deletion(self, mongo_user_id):
        """Deletes a user node and its associated relationships from Neo4j."""
        try:
            self.neo4j_db.delete_node("Utilisateur", "id", mongo_user_id)
            print(f"Sync: Utilisateur {mongo_user_id} supprime de Neo4j.")
        except Exception as e:
            print(f"Erreur de synchronisation utilisateur (delete Neo4j): {e}")