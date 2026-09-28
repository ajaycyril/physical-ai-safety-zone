# Fieldstack: five-minute demonstration

Public city: https://fieldstack-ajay.vercel.app/city.html
Public factory: https://fieldstack-ajay.vercel.app/studio.html

Use one complete mission in the meeting, rather than every scenario. The top field is editable. Examples load supported goals without dispatching them, and the line below the input previews the interpreted effect. No API key is required: the goal compiler is bounded and deterministic, not an LLM or a learned robotics policy.

## Suggested sequence

0:00–0:25: Show the persistent stack. Intent does not bypass mission authority or the local runtime.

0:25–0:45: Show the real input. On city, inspect the Abu Dhabi METAR, source time and weather policy. On factory, show decoded-video detections, their route constraint, and the separate simulated process measurements.

0:45–3:45: Run the main mission. City compares signal plans, surveys with a weather-eligible drone or a ground unit, requests signal authority and verifies controller feedback. Factory reads the gauge, compares process sensors, diagnoses, requests scoped isolation plus standby authority, verifies valve/flow feedback and returns to dock. Keep approvals prompt. Inspect telemetry while motion continues.

3:45–4:30: Show evidence and the resulting shared state. On factory, LINE-A changes from cooling interlock to producing when modeled supply exceeds its release threshold. This is a procedural dependency model, not another real robot connection.

4:30–5:00: Show Examples. Change the wording to a read-only inspection and show the preview; do not start a second long workflow unless time permits.

## Goals to type

City response: Reduce congestion at J-01. Protect pedestrians and ask before changing signals.

City read only: Survey J-01 only. Do not change the traffic signals.

Ground alternative: Inspect J-01 using the ground unit. Keep the drone docked.

Factory recovery: Restore cooling at P-204. Isolate V-12 and start standby SB-02 after approval.

Factory read only: Inspect cooling skid P-204 only. Do not actuate the valve.

Factory instrument audit: Compare the pressure gauge and transmitter at P-204. Do not isolate. Use the Sensor disagreement scenario to demonstrate conflicting instrument evidence.

Unknown target IDs, arbitrary numeric thresholds and safety bypasses are refused. Background transit and assembly assets provide inspectable scene context; they are not arbitrary command targets. Pause, stop and reset remain explicit controls.

## Boundaries

Real: downloaded footage, local neural perception, public Abu Dhabi weather integration, source timestamps, executable mission compiler, measured MuJoCo joint state, event recording.

Simulated: robots and plant, road controllers and district, pressure/flow dynamics, production dependency model, background transit and logistics. No real infrastructure is connected. This is a working reference implementation and presentation, not a certified production or safety system.

After loading, wait for READY and the actual vision inputs. Use the same presenting browser for a rehearsal. Approval pauses and device speed affect end-to-end duration.
