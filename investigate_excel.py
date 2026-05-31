import pandas as pd
import json

file_path = r"C:\Users\banda\OneDrive\Documents\overall sec 7 3rd year.xlsx"

try:
    # Read the whole excel file
    # We might need to skip some rows if the header isn't at the top
    # Let's try reading without skipping first to see the structure
    df = pd.read_excel(file_path)
    
    # Check first few rows and find where the actual header is
    # In many university attendance sheets, the first few rows are for title/subtitle
    # Let's print the first 10 rows to see
    print("--- First 10 rows of raw data ---")
    print(df.head(10).to_string())
    
    print("\n--- Columns ---")
    print(df.columns.tolist())

except Exception as e:
    print(f"Error: {e}")
