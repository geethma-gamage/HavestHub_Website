import pandas as pd
from sklearn.linear_model import LinearRegression
import pickle

# Load dataset
data = pd.read_csv("cleaned_price_data.csv")

# Simple example features
X = data[['quantity']]
y = data['price']

model = LinearRegression()
model.fit(X, y)

# Save model
pickle.dump(model, open("price_model.pkl", "wb"))

print("✅ Model trained and saved")
