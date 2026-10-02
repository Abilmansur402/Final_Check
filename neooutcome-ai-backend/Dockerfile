FROM python:3.11-slim

WORKDIR /app

COPY requirements-demo.txt ./
RUN pip install --no-cache-dir -r requirements-demo.txt

COPY patient_demo.py neooutcome_xgb.joblib ./

EXPOSE 8000

CMD ["python", "patient_demo.py", "serve", "--host", "0.0.0.0", "--port", "8000"]

