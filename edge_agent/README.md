# Edge Agent

Runs the physical CV loop locally with `roboflow/supervision`.

```bash
pip install -r requirements.txt
python safety_zone_agent.py --source 0 --zone "160,130 500,110 560,400 120,420"
```

Use a video file instead of a webcam:

```bash
python safety_zone_agent.py --source data/shop-floor.mp4 --zone "160,130 500,110 560,400 120,420" --output annotated.mp4
```

Optional hardware and cloud outputs:

```bash
python safety_zone_agent.py --source 0 --zone "160,130 500,110 560,400 120,420" --serial-port COM5 --webhook-url https://YOUR_APP.vercel.app/api/events
```
