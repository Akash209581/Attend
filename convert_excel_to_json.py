import pandas as pd
import json
import os
import numpy as np

file_path = r"C:\Users\banda\OneDrive\Documents\overall sec 7 3rd year.xlsx"
output_json = "overall_sec_7_3rd_year.json"

try:
    # Read the excel file, skipping the first 2 rows
    df_header = pd.read_excel(file_path, skiprows=2, nrows=1)
    headers = df_header.columns.tolist()
    
    # Row 4 is Conducted Hours
    df_conducted = pd.read_excel(file_path, skiprows=4, nrows=1, header=None)
    conducted_row = df_conducted.iloc[0].tolist()
    
    conducted_hours_dict = {}
    for i, h in enumerate(headers):
        if i < len(conducted_row):
            val = conducted_row[i]
            if h == 'SL' or h == 'REGD.NO' or h == 'NAME':
                continue
            # Handle NaN
            if pd.isna(val) or val == 'nan':
                conducted_hours_dict[h] = "-"
            else:
                conducted_hours_dict[h] = str(val)

    # Read students
    df_total = pd.read_excel(file_path, skiprows=2)
    df_students = df_total.iloc[2:].copy()
    
    # Replace NaN with "-"
    df_students = df_students.fillna("-")
    
    df_students.columns = [str(c).replace('\n', ' ').strip() for c in df_students.columns]
    
    records = df_students.to_dict(orient='records')
    
    final_output = [conducted_hours_dict] + records
    
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(final_output, f, indent=4)
        
    print(f"Successfully converted to {output_json}")
    print(f"Total students found: {len(records)}")

except Exception as e:
    print(f"Error: {str(e)}")
