from neo4j import GraphDatabase
import config

class Neo4jDB:
    def __init__(self):
        self.driver = GraphDatabase.driver(
            config.NEO4J_URI,
            auth=(config.NEO4J_USER, config.NEO4J_PASSWORD)
        )

    def close(self):
        self.driver.close()

    def _execute_query(self, query, parameters=None, fetch_type='all'):
        """
        Executes a Cypher query and processes the result based on fetch_type.
        'single': Returns the first record (or None if no records).
        'consume': Returns the ResultSummary (for operations like DELETE).
        'all': Returns a list of all records.
        """
        with self.driver.session() as session:
            result = session.run(query, parameters)
            if fetch_type == 'single':
                return result.single() # Returns a Record object or None
            elif fetch_type == 'consume':
                return result.consume() # Returns a ResultSummary object
            else: # Default 'all'
                return list(result) # Returns a list of Record objects

    # --- CRUD for Nodes ---
    def create_node(self, label, properties):
        """Creates a new node with the given label and properties."""
        props_str = ", ".join(f"{k}: ${k}" for k in properties.keys())
        query = f"CREATE (n:{label} {{{props_str}}}) RETURN n"
        # Use fetch_type='single' because we expect one node back
        record = self._execute_query(query, properties, fetch_type='single')
        return record[0] if record else None # Access the node from the Record

    def find_node(self, label, property_name, property_value):
        """Finds a node by label and a specific property."""
        query = f"MATCH (n:{label} {{{property_name}: $value}}) RETURN n"
        # Use fetch_type='single' because we expect one node back
        record = self._execute_query(query, {"value": property_value}, fetch_type='single')
        return record[0] if record else None

    def update_node(self, label, match_prop_name, match_prop_value, new_properties):
        """Updates properties of an existing node."""
        set_str = ", ".join(f"n.{k} = ${k}" for k in new_properties.keys())
        query = f"MATCH (n:{label} {{{match_prop_name}: $match_value}}) SET {set_str} RETURN n"
        params = {"match_value": match_prop_value, **new_properties}
        # Use fetch_type='single' because we expect one node back
        record = self._execute_query(query, params, fetch_type='single')
        return record[0] if record else None

    def delete_node(self, label, property_name, property_value):
        """Deletes a node and its relationships."""
        query = f"MATCH (n:{label} {{{property_name}: $value}}) DETACH DELETE n"
        # Use fetch_type='consume' for DELETE operations to get the summary
        summary = self._execute_query(query, {"value": property_value}, fetch_type='consume')
        return summary.counters.nodes_deleted > 0

    # --- Relationship Management ---
    def create_relationship(self, from_label, from_prop_name, from_prop_value,
                            to_label, to_prop_name, to_prop_value,
                            rel_type, rel_properties={}):
        """Creates a relationship between two nodes."""
        rel_props_str = ", ".join(f"{k}: ${k}" for k in rel_properties.keys())
        query = (f"MATCH (a:{from_label} {{{from_prop_name}: $from_value}}), "
                 f"(b:{to_label} {{{to_prop_name}: $to_value}}) "
                 f"MERGE (a)-[r:{rel_type} {{{rel_props_str}}}]->(b) RETURN r")
        params = {
            "from_value": from_prop_value,
            "to_value": to_prop_value,
            **rel_properties
        }
        # Use fetch_type='single' because we expect one relationship back
        record = self._execute_query(query, params, fetch_type='single')
        return record[0] if record else None

    def delete_relationship(self, from_label, from_prop_name, from_prop_value,
                            to_label, to_prop_name, to_prop_value,
                            rel_type):
        """Deletes a specific relationship between two nodes."""
        query = (f"MATCH (a:{from_label} {{{from_prop_name}: $from_value}})-[r:{rel_type}]->(b:{to_label} {{{to_prop_name}: $to_value}}) "
                 f"DELETE r")
        params = {
            "from_value": from_prop_value,
            "to_value": to_prop_value
        }
        # Use fetch_type='consume' for DELETE operations to get the summary
        summary = self._execute_query(query, params, fetch_type='consume')
        return summary.counters.relationships_deleted > 0

    # --- Specific Functions for Entities ---
    def create_patient_node(self, patient_id, nom, prenom, date_naissance=None):
        """Creates a patient node."""
        properties = {"id": patient_id, "nom": nom, "prenom": prenom}
        if date_naissance:
            properties["date_naissance"] = date_naissance
        return self.create_node("Patient", properties)

    def update_patient_node(self, patient_id, new_data):
        """Updates a patient node."""
        return self.update_node("Patient", "id", patient_id, new_data)

    def delete_patient_node(self, patient_id):
        """Deletes a patient node."""
        return self.delete_node("Patient", "id", patient_id)

    def create_medecin_node(self, medecin_id, nom, prenom, specialite):
        """Creates a doctor node."""
        properties = {"id": medecin_id, "nom": nom, "prenom": prenom, "specialite": specialite}
        return self.create_node("Medecin", properties)

    def update_medecin_node(self, medecin_id, new_data):
        """Updates a doctor node."""
        return self.update_node("Medecin", "id", medecin_id, new_data)

    def delete_medecin_node(self, medecin_id):
        """Deletes a doctor node."""
        return self.delete_node("Medecin", "id", medecin_id)

    def create_consultation_node(self, consultation_id, date_heure, motif):
        """Creates a consultation node."""
        properties = {"id": consultation_id, "date_heure": date_heure, "motif": motif}
        return self.create_node("Consultation", properties)

    def delete_consultation_node(self, consultation_id):
        """Deletes a consultation node."""
        return self.delete_node("Consultation", "id", consultation_id)

    def link_patient_to_medecin_traitant(self, patient_id, medecin_id):
        """Links a patient to their treating doctor."""
        return self.create_relationship(
            "Patient", "id", patient_id,
            "Medecin", "id", medecin_id,
            "A_POUR_MEDECIN_TRAITANT"
        )

    def remove_patient_medecin_traitant_link(self, patient_id, medecin_id):
        """Removes the link between a patient and their treating doctor."""
        return self.delete_relationship(
            "Patient", "id", patient_id,
            "Medecin", "id", medecin_id,
            "A_POUR_MEDECIN_TRAITANT"
        )

    def link_patient_consultation(self, patient_id, consultation_id):
        """Links a patient to a consultation."""
        return self.create_relationship(
            "Patient", "id", patient_id,
            "Consultation", "id", consultation_id,
            "CONSULTE"
        )
        
    def get_patients_assigned_to_medecin(self, medecin_id):
        """
        Retrieves the IDs of all patients who are assigned to a specific doctor
        as their treating physician in Neo4j.
        """
        query = (
            f"MATCH (p:Patient)-[:A_POUR_MEDECIN_TRAITANT]->(m:Medecin {{id: $medecin_id}}) "
            f"RETURN p.id AS patient_id"
        )
        parameters = {"medecin_id": medecin_id}
        # Fetch all records, each record will have a 'patient_id' property
        records = self._execute_query(query, parameters, fetch_type='all')
        # Extract patient IDs from the records
        return [record["patient_id"] for record in records]

    def link_consultation_medecin(self, consultation_id, medecin_id):
        """Links a consultation to a doctor."""
        return self.create_relationship(
            "Consultation", "id", consultation_id,
            "Medecin", "id", medecin_id,
            "EST_ASSIGNEE_A"
        )

    # --- Bonus: User ---
    def create_user_node(self, user_id, username, role):
        """Creates a user node."""
        properties = {"id": user_id, "username": username, "role": role}
        return self.create_node("Utilisateur", properties)

    def link_user_to_entity(self, user_id, entity_type, entity_id):
        """Links a user to an entity (Patient or Medecin)."""
        return self.create_relationship(
            "Utilisateur", "id", user_id,
            entity_type, "id", entity_id,
            "EST_ASSOCIE_A"
        )