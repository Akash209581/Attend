import pandas as pd
import sys

file_path = r"C:\Users\banda\OneDrive\Documents\overall sec 7 3rd year.xlsx"
output_file = "excel_preview.txt"

try:
    # Read the whole excel file
    df = pd.read_excel(file_path, header=None) # Read raw rows
    
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("Raw rows from Excel (First 15):\n")
        f.write(df.head(15).to_string())
        f.write("\n\nAll column names (Raw):\n")
        f.write(", ".join(map(str, df.iloc[0].values))) 

except Exception as e:
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(f"Error: {str(e)}")
