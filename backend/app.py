from flask import Flask     

app = Flask(__name__)

@app.get('/')

def test_responce():
    return {"message" : "backend running"}
    
    
if __name__ == "__main__":
    app.run(debug=True)
    