from flask import Flask, request, jsonify
import pickle
import numpy as np
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

model = pickle.load(open("price_model.pkl", "rb"))

@app.route('/predict', methods=['POST'])
def predict_price():
    data = request.json
    quantity = float(data['quantity'])

    prediction = model.predict(np.array([[quantity]]))
    return jsonify({
        "predicted_price": round(prediction[0], 2)
    })

if __name__ == '__main__':
    app.run(debug=True)
