from flask import Flask, request, jsonify 
from flask_cors import CORS
from fido2.webauthn import PublicKeyCredentialRpEntity, PublicKeyCredentialUserEntity
from fido2.server import Fido2Server

# https://www.geeksforgeeks.org/python/flask-creating-first-simple-application/
app = Flask(__name__)
CORS(app)

# fido setup
responce = PublicKeyCredentialRpEntity(
    id = "Localhost",
    name = "Passwordless authenticaiton"
)

server = Fido2Server(responce)

# temporary storage 
USERS = {}
CREDENTIALS = {}
STATES = {}

app.get("/")

def root():
    return {"message" : "backend is running"}

app.post("/register/start")
def register_start():
    username = request.json ["username"]
    
    user  = PublicKeyCredentialUserEntity(
        id = username.encode(),
        name = username,
        display_name=username,
    )
    
    options, state = server.register_begin(
        user,
        credentials=[],
        user_verification="preffered",
    )
    
    USERS[username] = user
    STATES[username] = state

    return jsonify(options)
    
if __name__ == "__main__":
    app.run(debug=True)

        