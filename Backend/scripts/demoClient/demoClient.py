import tkinter as tk
from tkinter import filedialog
import requests

# Replace with your scheduler URL if needed.
SCHEDULER_URL = "http://localhost:5000"

def upload_code(zip_file_path):
    url = f"{SCHEDULER_URL}/upload_code"
    with open(zip_file_path, 'rb') as f:
        files = {'code': f}
        response = requests.post(url, files=files)
    return response.json()

def select_file_and_upload():
    root = tk.Tk()
    root.withdraw()  # Hide the main window.
    file_path = filedialog.askopenfilename(
        title="Select a ZIP file containing your project",
        filetypes=[("ZIP Files", "*.zip")]
    )
    if file_path:
        result = upload_code(file_path)
        print("Response from scheduler:")
        print(result)
    else:
        print("No file selected.")

if __name__ == '__main__':
    select_file_and_upload()
