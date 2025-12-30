from flask import Flask, request, jsonify 
from flask_cors import CORS
from fido2.webauthn import PublicKeyCredentialRpEntity, PublicKeyCredentialUserEntity
from fido2.server import Fido2Server
from fido2.utils import websafe_decode
#https://github.com/Yubico/python-fido2
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

# register start endpoint
app.post("/register/start")
def register_start():
    username = request.json["username"]
    
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

# register finish endpoint 
app.post("/register/finish")
def register_finish():
    username = request.json["username"]
    credential = request.json["username"]
    authentication_data = server.register_complete(
        USERS[username],
        STATES[username],
        websafe_decode(credential["id"]),
        credential
    )
    
    CREDENTIALS[username] = authentication_data
    return {"status" : "registered"}
# https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API
# login start endpoint
app.post("/login/start")
def login_start():
    username = request.json["username"]
    creds = CREDENTIALS.get(username)
    
    if not creds:
        return {"error" : "user is not registered"}, 404
    
    options, state = server.authenticate_begin(
        [creds.credential_data],
        user_verification="preferred",
    )
    STATES[username] = state
    return jsonify(options)

# login finish endpoint
app.post("/login/finish")
def login_finish():
    username = request.json["username"] # username + auth responce retrieved
    credential = request.json["credential"]
    creds = CREDENTIALS.get(username) # stored credential fetch
    
    server.authenticate_complete( # validates cryptographic signature
        STATES[username],
        [creds.credential_data],
        websafe_decode(credential["id"]),
        credential,
    )
    
    return {"status" : "authenticated"}


if __name__ == "__main__":
    app.run(debug=True)

        