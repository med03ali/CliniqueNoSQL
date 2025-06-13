from pymongo import MongoClient
from bson.objectid import ObjectId
import config

class MongoDB:
    def __init__(self):
        self.client = MongoClient(config.MONGO_URI)
        self.db = self.client[config.MONGO_DB_NAME]

    def get_collection(self, collection_name):
        """Returns a specific MongoDB collection."""
        return self.db[collection_name]

    # --- Generic CRUD Operations ---
    def create_document(self, collection_name, data):
        """Inserts a new document into the specified collection."""
        collection = self.get_collection(collection_name)
        result = collection.insert_one(data)
        return str(result.inserted_id)

    def find_document(self, collection_name, query):
        """Finds a single document matching the query."""
        collection = self.get_collection(collection_name)
        return collection.find_one(query)

    def find_documents(self, collection_name, query={}):
        """Finds multiple documents matching the query."""
        collection = self.get_collection(collection_name)
        return list(collection.find(query))

    def update_document(self, collection_name, query, new_data):
        """Updates a document matching the query with new data."""
        collection = self.get_collection(collection_name)
        result = collection.update_one(query, {"$set": new_data})
        return result.modified_count > 0

    def delete_document(self, collection_name, query):
        """Deletes a document matching the query."""
        collection = self.get_collection(collection_name)
        result = collection.delete_one(query)
        return result.deleted_count > 0

    # --- Specific Functions for Patients ---
    def add_patient(self, patient_data):
        """Adds a new patient document."""
        return self.create_document("patients", patient_data)

    def get_patient(self, patient_id):
        """Retrieves a patient document by ID."""
        return self.find_document("patients", {"_id": ObjectId(patient_id)})

    def get_all_patients(self):
        """Retrieves all patient documents."""
        return self.find_documents("patients")

    def update_patient(self, patient_id, new_data):
        """Updates an existing patient document."""
        return self.update_document("patients", {"_id": ObjectId(patient_id)}, new_data)

    def delete_patient(self, patient_id):
        """Deletes a patient document by ID."""
        return self.delete_document("patients", {"_id": ObjectId(patient_id)})

    # --- Specific Functions for Doctors ---
    def add_medecin(self, medecin_data):
        """Adds a new doctor document."""
        return self.create_document("medecins", medecin_data)

    def get_medecin(self, medecin_id):
        """Retrieves a doctor document by ID."""
        return self.find_document("medecins", {"_id": ObjectId(medecin_id)})

    def get_all_medecins(self):
        """Retrieves all doctor documents."""
        return self.find_documents("medecins")

    def update_medecin(self, medecin_id, new_data):
        """Updates an existing doctor document."""
        return self.update_document("medecins", {"_id": ObjectId(medecin_id)}, new_data)

    def delete_medecin(self, medecin_id):
        """Deletes a doctor document by ID."""
        return self.delete_document("medecins", {"_id": ObjectId(medecin_id)})

    # --- Specific Functions for Consultations ---
    def add_consultation(self, consultation_data):
        """Adds a new consultation document."""
        return self.create_document("consultations", consultation_data)

    def get_consultation(self, consultation_id):
        """Retrieves a consultation document by ID."""
        return self.find_document("consultations", {"_id": ObjectId(consultation_id)})

    def get_consultations_by_patient(self, patient_id):
        """Retrieves consultations for a specific patient."""
        return self.find_documents("consultations", {"patient_id": patient_id})

    def get_consultations_by_medecin(self, medecin_id):
        """Retrieves consultations for a specific doctor."""
        return self.find_documents("consultations", {"medecin_id": medecin_id})

    def update_consultation(self, consultation_id, new_data):
        """Updates an existing consultation document."""
        return self.update_document("consultations", {"_id": ObjectId(consultation_id)}, new_data)

    def delete_consultation(self, consultation_id):
        """Deletes a consultation document by ID."""
        return self.delete_document("consultations", {"_id": ObjectId(consultation_id)})

    # --- Authentication ---
    def add_user(self, user_data):
        """Adds a new user document."""
        return self.create_document("users", user_data)

    def find_user_by_username(self, username):
        """Finds a user document by username."""
        return self.find_document("users", {"username": username})
    
    def find_medecin_by_username(self,username):
        """Finds a doctor document by username."""
        return self.find_document("medecins",{"username": username})
    
    def find_patient_by_username(self,username):
        """Finds a patient document by username."""
        return self.find_document("patients",{"username": username})