# GridSense Backend API

Python Flask backend that serves data from the SQLite database to the React frontend.

## Setup

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the server:**
   ```bash
   python app.py
   ```

   The server will start on `http://localhost:8000`

## API Endpoints

- `GET /health` - Health check
- `GET /grid-data/buses` - Get all buses with coordinates
- `GET /grid-data/branches` - Get all transmission lines
- `GET /grid-data/generators` - Get all generators
- `GET /grid-data/economic` - Get economic/LMP history data
- `GET /grid-data/lmp-forecast` - Get LMP forecast data
- `GET /grid-data/loss-components` - Get transmission loss data
- `GET /grid-data/bus/<id>` - Get specific bus by ID
- `GET /grid-data/statistics` - Get grid statistics

## Testing

Test the API with curl:
```bash
curl http://localhost:8000/health
curl http://localhost:8000/grid-data/buses
curl http://localhost:8000/grid-data/statistics
```

## Database

The backend connects to `gridsense_iso_ne.db` in the project root directory.

## CORS

CORS is enabled for all origins to allow the React frontend to communicate with the API.
