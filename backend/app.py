from flask import Flask, request, jsonify
from flask_cors import CORS
from fido2.webauthn import PublicKeyCredentialRpEntity, PublicKeyCredentialUserEntity
from fido2.server import Fido2Server
from fido2.utils import websafe_decode, websafe_encode
from types import MappingProxyType
import traceback
from datetime import datetime
import secrets
import hashlib
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
# recovery codes dict
RECOVERY_CODES = {}
AUTHENTICATOR_TYPES = {}

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
        authenticator_type = request.json['authenticator_type', 'platform']
        
        # Create user entity with unique identifier
        #https://www.w3.org/TR/webauthn-2/#dictdef-publickeycredentialuserentity
        user = PublicKeyCredentialUserEntity(
            id=username.encode(),
            name=username,
            display_name=username,
        )
        # set the authenticator attachement based on its type
        if authenticator_type == "cross-platform":
            authenticator_attachment = "cross-platform"
        elif authenticator_type == "platform":
            authenticator_attachment = "platform"
        else:
            authenticator_attachment = None

        # Generate registration options and state
        # https://developers.yubico.com/python-fido2/API_Documentation/fido2.server.html
        options, state = server.register_begin(
            user,
            credentials=[],
            user_verification="preferred",
            resident_key_requirement="required", # enables discoverable credentials
            authenticator_attachment=authenticator_attachment,
            attestation="direct"
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
        
        is_new_usr = username not in CREDENTIALS
        
        if is_new_usr:
            CREDENTIALS[username] = []
            AUTHENTICATOR_TYPES[username] = []
            
            
        CREDENTIALS[username].append(auth_data)
        REGISTRATION_TIMES[username] = datetime.now().strftime("%Y-%m-%d %H:%M")
        
        authenticator_attachment = credential.get("authenticatorAttachment", "unknown")
        AUTHENTICATOR_TYPES[username].append({
                    "credential_id": credential["id"],
                    "type": authenticator_attachment,
                    "registered_at": datetime.now().strftime("%Y-%m-%d %H:%M")
                })
        
        recovery_codes = None
        if is_new_usr:
            recovery_codes = Recovery_code_generator(8)
            # store hashed codes in RECOVERY_CODES dict
            RECOVERY_CODES[username] = [hashcode(code) for code in recovery_codes]
            
        print(f"User {username} registered successfully!")
        
        return jsonify({
            "status": "registered",
            "recovery_codes": recovery_codes  # sends on first registration attempt
        })
            
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
                "credential_count" : len(CREDENTIALS.get(usr, [])),
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


# get user passkeys endpoint
@app.route("/user/passkeys", methods=["POST"])
def get_user_passkeys(): 
    try:
        usr = request.json["username"]
        creds = CREDENTIALS.get(usr, [])
        
        passkeys = []
        # append all user specific passkeys 
        for i, cred in enumerate(creds):
            passkeys.append({
                "id" : i,
                "credential_id" : str(cred.credential_data.credential_id.hex()),
                "registered_at" : REGISTRATION_TIMES.get(f"{usr} - {i}")  
            })
            
            return jsonify({"passkeys" : passkeys})
        
    except Exception as e:
        print(f"Error in get_user_passkeys for {usr}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
# delete user specific passkey
@app.route("/user/passkeys/<int:passkey_id>", methods=["DELETE"])
def delete_user_passkey(passkey_id):
    try:
        usr = request.json["username"]
        creds = CREDENTIALS.get(usr, [])
        
        if not creds:
            return jsonify({f"Error {usr} not found"}), 404
        
        if passkey_id < 0 or passkey_id >= len(creds):
            return jsonify({"Error passkey not found"}), 404
        # ensures that there is atleast one passkey always
        if len(passkey_id == 0):
            return jsonify({"Error cannot delete last passkey, register another device first!"}), 404
        # remove the credential 
        CREDENTIALS[usr].pop(passkey_id)
        
        print(f"Passkey deleted: {passkey_id} for user: {usr}")
        return jsonify({"status": "deleted", "passkey_id": passkey_id})
    except Exception as e:
        print(f"Error in delete_user_passkey")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# usernameless login start endpoint
# login without username using discoverable creds
@app.route("/login/start/usernameless", methods=["POST"])
def login_start_usernameless():
    try:
        options, state = server.authenticate_begin(
            credentials = [], # empty for browser to show available passkeys
            user_verification='required',       
        )
        
        #states are stored using temporary keys
        STATES["_usernameless_"] = state 
        opt_dict = serialize_options(options) 
        return jsonify(opt_dict)
    
    except Exception as e:
        print(f"Error in login_start_usernameless")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
       
# usernameless login finish endpoint
@app.route("/login/finish/usernameless", methods=["POST"]) 
def login_finish_usernameless():
    try:
        cred = request.json["credential"]
        print(f"Cred recieved: {cred}")
        
        
        usr_handle = cred["response"].get("userHandle")
        if not usr_handle:
            return jsonify({"error": "No userHandle in the response"}), 400
        
        #decode the usr_handle to get username using base64
        # https://stackoverflow.com/questions/3302946/how-to-decode-base64-url-in-python
        import base64
        username = base64.urlsafe_b64decode(usr_handle + "==").decode("utf-8")
        print(f"Username from decoded usr_handle: {username}")
        
        creds = CREDENTIALS.get(username)
        
        if not creds:
            return jsonify({"error": "No user has been found"}), 404 
            
        # Get all credential data from the list
        credential_data_list = [c.credential_data for c in creds]
            
        authentication_response = {
            "id": cred["id"],
            "rawId": cred["rawId"],
            "response": {
                "clientDataJSON": cred["response"]["clientDataJSON"],
                "authenticatorData": cred["response"]["authenticatorData"],
                "signature": cred["response"]["signature"],
            },
            "type": cred["type"],
            "clientExtensionResults": cred.get("clientExtensionResults", {}),
        }
        
        server.authenticate_complete(
            STATES["_usernameless_"],
            credential_data_list,
            authentication_response,
        )
        
        print(f"User {username} authenticated successfully (usernameless)!")
        return jsonify({"status": "authenticated", "username": username})
    except Exception as e:
        print(f"Error in login_finish_usernameless: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
        
# imported secrets for code generation 
# https://docs.python.org/3/library/secrets.html
def Recovery_code_generator(count=8):
    codes = []
    i = 1
    while i <= count:
        code = secrets.token_hex(4).upper()
        code = f"{code[:4]}-{code[4:]}"
        codes.append(code)
        i+=1
    return codes

# Recovery code hash 
# https://docs.python.org/3/library/hashlib.html
def hashcode(code):
    return hashlib.sha256(code.encode()).hexdigest()

@app.route("/recover", methods=["POST"])
def recover_account():
    try:
        usr = request.json["username"]
        recovery_code = request.json["recovery_code"]
        
        # check if the user exists
        if usr not in RECOVERY_CODES: 
            return jsonify({"error": "No user has been found"}), 404 
        
        hashed_code = hashcode(recovery_code)
        
        # check if the recovery code is valid or not 
        if hashed_code not in RECOVERY_CODES[usr]:
            return jsonify({"error": "Invalid recovery code"}), 400
        
        RECOVERY_CODES[usr].remove(hashed_code) # one time usage only
        
        # registration options for the new passkey
        user = PublicKeyCredentialUserEntity(
            id=usr.encode(),
                name=usr,
                display_name=usr,
            )
        
        # get existing creds to exclude
        existing_credentials = CREDENTIALS.get(usr, [])
        exclude_credentials = [cred.credential_data for cred in existing_credentials]
            
        options, state = server.register_begin(
                user,
                credentials=exclude_credentials,
                user_verification="required",
                resident_key_requirement="required",
            )
        
        USERS[usr] = user
        STATES[usr] = state
        
        options_dict = serialize_options(options)
        
        print(f"Recovery initiated for {usr}. Codes remaining: {len(RECOVERY_CODES[usr])}")
        
        return jsonify({
            "status": "recovery_approved",
            "options": options_dict,
            "codes_remaining": len(RECOVERY_CODES[usr])
        })
    except Exception as e:
        print(f"ERROR in recover_account: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
    
        
@app.route("/user/authenticators", methods=["POST"])
def get_user_authenticators():
    try:
        usr = request.json["username"]
        authenticators = AUTHENTICATOR_TYPES.get(usr, [])
        
        return jsonify({"authenticators" : authenticators})
    except Exception as e:
        print(f"Error in get_user_authenticators: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
        
        
    

if __name__ == "__main__":
    # https://flask.palletsprojects.com/en/stable/server/
    # Use port 5001 to avoid conflict with macOS AirPlay on port 5000
    app.run(host="0.0.0.0", port=5001, debug=True)