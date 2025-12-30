from flask import Flask   
from flask_cors import CORS
from fido2.webauthn import PublicKeyCredentialRpEntity
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

    
if __name__ == "__main__":
    app.run(debug=True)

        