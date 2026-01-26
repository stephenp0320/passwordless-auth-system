from flask import Flask, request, jsonify
from flask_cors import CORS
from fido2.webauthn import PublicKeyCredentialRpEntity, PublicKeyCredentialUserEntity
from fido2.server import Fido2Server
from fido2.utils import websafe_decode, websafe_encode
from types import MappingProxyType
import traceback
# Flask application setup
# Reference: https://flask.palletsprojects.com/en/stable/quickstart/
app = Flask(__name__)

# CORS (Cross-Origin Resource Sharing) configuration
# Allows frontend on different port to communicate with backend
# Reference: https://flask-cors.readthedocs.io/en/latest/
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

@app.before_request
def log_request():
    """Log incoming requests for debugging"""
    print("INCOMING:", request.method, request.path)

@app.after_request
def after_request(response):
    #Ensure CORS headers are set on all responses
    #https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS, DELETE')
    return response

# FIDO2 WebAuthn Server Setup
# https://github.com/Yubico/python-fido2
#https://developers.yubico.com/python-fido2/
rp = PublicKeyCredentialRpEntity(
    id="localhost",
    name="Passwordless authentication"
)

server = Fido2Server(rp)
# Temporary in-memory storage for users, credentials, and registration states
USERS = {}
CREDENTIALS = {}
STATES = {}
#dict to track registration times
REGISTRATION_TIMES = {}

@app.get("/")
def root():
    """Health check endpoint"""
    return {"message": "backend is running"}


# Convert fido2 options object to JSON-serializable dictionary.
    
# https://www.w3.org/TR/webauthn-2/#dictdef-publickeycredentialcreationoptions
# https://github.com/Yubico/python-fido2/blob/main/fido2/webauthn.py
def serialize_options(options):
# The python-fido2 library returns complex objects that cannot be directly
# serialized to JSON. This function recursively converts bytes to base64url
# strings, enums to their values, and handles nested structures.
    from enum import Enum
    
    def convert(obj):
        if obj is None:
            return None
        elif isinstance(obj, bytes):
            # Convert bytes to base64url encoding as per WebAuthn spec
            # https://www.w3.org/TR/webauthn-2/#sctn-encoding
            return websafe_encode(obj).decode('ascii')
        elif isinstance(obj, Enum):
            # Convert enum to its string value
            return obj.value
        elif isinstance(obj, (dict, MappingProxyType)):
            return {k: convert(v) for k, v in obj.items()}
        elif isinstance(obj, (list, tuple)):
            return [convert(i) for i in obj]
        elif isinstance(obj, (str, int, float, bool)):
            return obj
        elif hasattr(obj, '__iter__') and not isinstance(obj, str):
            return [convert(i) for i in obj]
        elif hasattr(obj, '__dict__'):
            return {k: convert(v) for k, v in vars(obj).items() if not k.startswith('_')}
        else:
            return str(obj)
    
    return convert(dict(options))

# This endpoint initiates the registration process by generating a challenge and credential creation options for the authenticator.
# https://www.w3.org/TR/webauthn-2/#sctn-registering-a-new-credential
# https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API#registration

@app.route("/register/start", methods=["POST"])
def register_start():
    try:
        username = request.json["username"]
        # Create user entity with unique identifier
        #https://www.w3.org/TR/webauthn-2/#dictdef-publickeycredentialuserentity
        user = PublicKeyCredentialUserEntity(
            id=username.encode(),
            name=username,
            display_name=username,
        )

        # Generate registration options and state
        # https://developers.yubico.com/python-fido2/API_Documentation/fido2.server.html
        options, state = server.register_begin(
            user,
            credentials=[],
            user_verification="preferred",
        )
        
        # Store user and state for the completion step
        USERS[username] = user
        STATES[username] = state

        # Serialize options for JSON response
        options_dict = serialize_options(options)
        print("OPTIONS DICT:", options_dict)
        return jsonify(options_dict)
    except Exception as e:
        print(f"ERROR in register_start: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# This endpoint verifies the authenticator's response and stores the credential for future authentication.
# https://www.w3.org/TR/webauthn-2/#sctn-registering-a-new-credential
# https://simplewebauthn.dev/docs/packages/server

@app.route("/register/finish", methods=["POST"])
def register_finish():
    try:
        username = request.json["username"]
        credential = request.json["credential"]
        
        print(f"Credential received: {credential}")
        
        # Structure the response to match fido2 RegistrationResponse format
        #https://github.com/Yubico/python-fido2/blob/main/fido2/webauthn.py
        registration_response = {
            "id": credential["id"],
            "rawId": credential["rawId"],
            "response": {
                "clientDataJSON": credential["response"]["clientDataJSON"],
                "attestationObject": credential["response"]["attestationObject"],
            },
            "type": credential["type"],
            "clientExtensionResults": credential.get("clientExtensionResults", {}),
        }
        
        # Verify the registration response and extract credential data
        auth_data = server.register_complete(
            STATES[username],
            registration_response
        )
        
        # Store credential for future authentication
        # if a user does not exist, create an empty list 
        if username not in CREDENTIALS:
            CREDENTIALS[username] = []
        # add new credentials to the list 
        CREDENTIALS[username].append(auth_data)
        
        
        print(f"User {username} registered successfully!")
        return {"status": "registered"}
    except Exception as e:
        print(f"ERROR in register_finish: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# This endpoint initiates the authentication process by generating a challenge and credential request options.
    
# https://www.w3.org/TR/webauthn-2/#sctn-verifying-assertion
# https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API#authentication
@app.route("/login/start", methods=["POST"])
def login_start():
    try:
        username = request.json["username"]
        creds = CREDENTIALS.get(username)
        
        if not creds:
            return {"error": "user is not registered"}, 404
        
        cred_data_list = [crd.credential_data for crd in creds]
        
        # Generate authentication options with allowed credentials
        # https://www.w3.org/TR/webauthn-2/#dictdef-publickeycredentialrequestoptions
        options, state = server.authenticate_begin(
            cred_data_list,
            user_verification="preferred",
        )
        STATES[username] = state
        
        options_dict = serialize_options(options)
        return jsonify(options_dict)
    except Exception as e:
        print(f"ERROR in login_start: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# This endpoint verifies the authenticator's assertion response to authenticate the user.
    
# https://www.w3.org/TR/webauthn-2/#sctn-verifying-assertion
# https://simplewebauthn.dev/docs/packages/server/verifyAuthenticationResponse
@app.route("/login/finish", methods=["POST"])
def login_finish():
    # This endpoint verifies the authenticator's assertion response to authenticate the user.
    #https://www.w3.org/TR/webauthn-2/#sctn-verifying-assertion
    #https://simplewebauthn.dev/docs/packages/server/verifyAuthenticationResponse
    
    try:
        username = request.json["username"]
        credential = request.json["credential"]
        creds = CREDENTIALS.get(username)
        
        print(f"Login credential received: {credential}")
        
        # Structure the response to match fido2 AuthenticationResponse format
        # https://github.com/Yubico/python-fido2/blob/main/fido2/webauthn.py
        authentication_response = {
            "id": credential["id"],
            "rawId": credential["rawId"],
            "response": {
                "clientDataJSON": credential["response"]["clientDataJSON"],
                "authenticatorData": credential["response"]["authenticatorData"],
                "signature": credential["response"]["signature"],
            },
            "type": credential["type"],
            "clientExtensionResults": credential.get("clientExtensionResults", {}),
        }
        
        
        cred_data_list = [crd.credential_data for crd in creds]

        
        # Verify the authentication response
        server.authenticate_complete(
            STATES[username],
            cred_data_list,
            authentication_response,
        )
        
        print(f"User {username} authenticated successfully!")
        return {"status": "authenticated"}
    except Exception as e:
        print(f"ERROR in login_finish: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
# get users endpoint
@app.route("/admin/users", methods=["GET"])
def get_users():    
    try:
        users = []
        for usr in CREDENTIALS.keys():
            users.append({
                "username" : usr,
                "registered_at" : REGISTRATION_TIMES.get(usr),
                "credential_id" : str(CREDENTIALS.get(usr)),
            })
        return jsonify({"users" : users})
    except Exception as e:
        print(f"Error in get_users endpoint", {e})
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
# revoke credentials endpoint
@app.route("/admin/revoke", methods=["DELETE"])
def revoke_credentials():    
    try:
        usr = request.json["username"]
        
        if usr not in CREDENTIALS:
            return jsonify({"ERROR" : f"{usr} was not found"}), 404
        
        CREDENTIALS.pop(usr, None)
        USERS.pop(usr, None)
        STATES.pop(usr, None)
        return jsonify({"status": "revoked", "username": usr})
    
    except Exception as e:
        print(f"Error in revoke_credentials endpoint", {e})
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500



if __name__ == "__main__":
    # https://flask.palletsprojects.com/en/stable/server/
    # Use port 5001 to avoid conflict with macOS AirPlay on port 5000
    app.run(host="0.0.0.0", port=5001, debug=True)