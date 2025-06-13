# @app.route("/medecin/login", methods=["POST"])
# # def login():
# #     data = request.get_json()
# #     username = data.get("username")
# #     password = data.get("password")

# #     user = mongo_db.find_user_by_username(username)
# #     # if user and check_password_hash(user["password_hash"], password): # MODIFIED
# #     if user and user["password"] == password: # Checking plain text password - SECURITY RISK!
# #         # Utilise l'ID MongoDB de l'utilisateur comme identité JWT
# #         access_token = create_access_token(identity=str(user["_id"]))
# #         return jsonify(access_token=access_token), 200
# #     return jsonify({"msg": "Mauvais nom d'utilisateur ou mot de passe"}), 401