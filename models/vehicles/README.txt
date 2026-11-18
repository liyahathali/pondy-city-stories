DROP-IN REALISTIC VEHICLES
==========================
Put .glb / .gltf files here and the game uses them instead of the built-in vehicles.

Name each file after the vehicle type it replaces (anything after an underscore is ignored,
so you can have several models of one type - the game picks one at random per vehicle):

  car_swift.glb   car_city.glb   car_creta.glb      (all private cars)
  taxi.glb        police.glb     bus.glb
  auto.glb        motorcycle.glb scooter.glb   cycle.glb
  moped.glb       twostroke.glb  vintage.glb   commuter.glb   retro80.glb

* The game turns, scales and centres each model automatically.
* If the model faces backwards, add _rev to the name (e.g. car_swift_rev.glb).
* Compressed (Draco / Meshopt) .glb files are supported.

Where to get free models (check each model's licence):
  Sketchfab: search e.g. "Maruti Swift", "Hyundai Creta", "Honda Activa", "Bajaj auto rickshaw",
             tick "Downloadable", download as glTF Binary (.glb).
  Poly Pizza (poly.pizza) and Kenney (kenney.nl) - free CC0 models.
After adding files, restart start-windows.bat and press Ctrl+F5 in the browser.
