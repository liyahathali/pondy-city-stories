// Language support: English + Tamil (தமிழ்).
// Usage: t('key', arg0, arg1) — placeholders {0}, {1} are replaced. Static HTML uses data-i18n="key".
import { G } from './state.js';

const EN = {
  // ---- menus / static ----
  'title.tag': 'An open-world adventure in Puducherry',
  'title.logo2': 'CITY STORIES',
  'menu.new': 'New Game', 'menu.continue': 'Continue', 'menu.controls': 'Controls', 'menu.settings': 'Settings',
  'menu.paused': 'PAUSED', 'menu.resume': 'Resume', 'menu.save': 'Save Game', 'menu.load': 'Load Game', 'menu.map': 'Map', 'menu.quit': 'Quit to Title', 'menu.back': 'Back',
  'menu.langToggle': 'தமிழ்', 'menu.fullscreen': '⛶ Fullscreen',
  'load.textures': 'Generating textures…', 'load.streets': 'Laying out the streets of Pondicherry…', 'load.city': 'Building White Town, the Tamil Quarter and the beaches…',
  'load.sky': 'Painting the sunset over Rock Beach…', 'load.people': 'Waking up the auto rickshaw drivers…', 'load.shaders': 'Compiling shaders…', 'load.ready': 'Ready!',
  'controls.title': 'CONTROLS', 'controls.foot': 'On foot', 'controls.driving': 'Driving', 'controls.general': 'General',
  'c.move': 'Move', 'c.look': 'Look around', 'c.run': 'Run', 'c.jump': 'Jump', 'c.crouch': 'Crouch', 'c.punch': 'Punch', 'c.enter': 'Enter / exit / carjack vehicle',
  'c.interact': 'Talk · Buy chai · Start mission', 'c.accel': 'Accelerate / Brake & reverse', 'c.steer': 'Steer', 'c.handbrake': 'Handbrake (drift!)', 'c.horn': 'Horn',
  'c.siren': 'Police siren (police car)', 'c.zoom': 'Camera zoom', 'c.map': 'Map (click to set waypoint)', 'c.garage': 'Vehicle selection', 'c.rain': 'Toggle rain',
  'c.time': 'Fast-forward time', 'c.quick': 'Quick save / load', 'c.pause': 'Pause',
  'settings.title': 'SETTINGS', 'settings.quality': 'Graphics quality', 'settings.qHigh': 'High (shadows, more traffic)', 'settings.qMed': 'Medium', 'settings.qLow': 'Low (fast)',
  'settings.sens': 'Mouse sensitivity', 'settings.vol': 'Volume', 'settings.invert': 'Invert mouse Y', 'settings.lang': 'Language / மொழி', 'settings.voices': 'NPC Tamil voices', 'settings.scale': 'Render scale (upscaler)', 'settings.fx': 'Realistic effects (bloom, colour grading, reflections)', 'settings.pixel': 'Pixel art style (chunky textures, warm colours)', 'settings.real': 'Realistic 3D characters (nearby people)', 'p.shop': 'Press <kbd>E</kbd> to buy {0} (₹{1})', 'shop.money': 'Not enough money for {0}!', 'shop.ok': '{0}! +{1} health (−₹{2})', 'shop.flowers': 'You bought fresh {0} (−₹{1}). Smells lovely!', 'settings.radioVol': 'Radio volume', 'c.radio': 'Change radio station',
  'noTamilVoice': 'Tip: no Tamil voice is installed in this browser, so NPCs talk with speech bubbles only. Open the game in <b>Microsoft Edge</b> to hear them speak Tamil.',
  'radio.off': 'Radio off', 'radio.nomusic': 'Put your own MP3 files in the <b>music</b> folder to hear them here.', 'radio.mymusic': 'My Music',
  'garage.title': 'VEHICLE SELECTION', 'garage.sub': 'Pick a ride — it will be delivered next to you.', 'garage.close': 'Close (V)', 'garage.top': 'Top speed {0} km/h',
  'map.head': 'MAP OF PONDICHERRY', 'map.help': 'Left-click: set waypoint · Right-click: clear · M / Esc: close',
  // ---- HUD / gameplay ----
  'welcome.title': 'PONDICHERRY', 'welcome.sub': 'Welcome to the French Riviera of the East',
  'tutorial': 'Walk into the ~y~pink marker~w~ and press <kbd>E</kbd> to start your first mission. Press <kbd>F</kbd> near a vehicle to ride it. <kbd>Esc</kbd> for controls.',
  'saved': 'Game saved.', 'saved.auto': 'Progress auto-saved.', 'loaded': 'Game loaded.', 'saved.pause': 'Game saved!', 'nosave': 'No saved game found.',
  'pause.stats': 'Money ₹{0} · Missions {1}/8 · Cash stashes {2}<br>Distance driven {3} km · Time {4}',
  'delivered': 'Your {0} has been delivered. Press <kbd>F</kbd> to get in.',
  'wasted': 'WASTED', 'busted': 'BUSTED', 'hospitalBill': 'Hospital bill: ₹100', 'fine': 'Bribe… er, fine: ₹100',
  'rain.on': 'Monsoon rain incoming…', 'rain.off': 'The rain is clearing up.',
  'stolenCop': 'You stole a police car!', 'carjacked': 'Carjacked!',
  'chai.money': 'Not enough money for chai!', 'chai.full': 'You are already fresh as a jasmine flower.', 'chai.ok': 'Hot chai! +30 health (−₹10)',
  'wanted': 'Wanted level {0}', 'lostCops': 'You lost the cops.',
  'found': 'Found ₹{0}! ({1}/{2} stashes)', 'health': '+50 health',
  'p.mission': 'Press <kbd>E</kbd> to start mission: <b>{0}</b>', 'p.enter': 'Press <kbd>F</kbd> to enter the {0}', 'p.jack': 'Press <kbd>F</kbd> to carjack the {0}',
  'p.chai': 'Press <kbd>E</kbd> to buy chai (₹10, +30 health)', 'p.talk': 'Press <kbd>E</kbd> to talk', 'siren': '  [G] siren',
  'outskirts': 'Pondicherry Outskirts',
  'mpass': 'MISSION PASSED!', 'mfail': 'MISSION FAILED!', 'mf.vehicle': 'The vehicle was destroyed.', 'mf.time': 'Out of time!',
  'mo.walkAayi': 'Get off your vehicle and walk to the ~y~Aayi Mandapam~w~.', 'mo.backAuto': 'Get back in the ~y~auto~w~!', 'mo.stop': 'Stop to let the passenger in!',
  'mo.onboard': 'Passenger on board!', 'mo.backVeh': 'Get back in your vehicle!', 'mo.cp': 'Checkpoint {0}/{1}',
  // ---- vehicles ----
  'v.car': 'Hatchback', 'v.taxi': 'Yellow Taxi', 'v.police': 'Police Car', 'v.auto': 'Auto Rickshaw', 'v.motorcycle': 'Motorcycle', 'v.scooter': 'Scooter', 'v.bus': 'PRTC Bus', 'v.cycle': 'Bicycle', 'v.moped': 'Moped 50', 'v.twostroke': '2-Stroke 100', 'v.vintage': 'Classic Scooter', 'v.commuter': 'Commuter 100', 'v.retro80': '80s Retro Scooter', 'v.flycar': 'Nova Sky (flying EV)',
};

const TA = {
  'title.tag': 'புதுச்சேரியில் ஒரு திறந்த-உலக சாகசம்',
  'title.logo2': 'நகரக் கதைகள்',
  'menu.new': 'புதிய விளையாட்டு', 'menu.continue': 'தொடரவும்', 'menu.controls': 'கட்டுப்பாடுகள்', 'menu.settings': 'அமைப்புகள்',
  'menu.paused': 'இடைநிறுத்தம்', 'menu.resume': 'மீண்டும் தொடர்', 'menu.save': 'சேமி', 'menu.load': 'ஏற்று', 'menu.map': 'வரைபடம்', 'menu.quit': 'முதல் திரைக்கு', 'menu.back': 'பின் செல்',
  'menu.langToggle': 'English', 'menu.fullscreen': '⛶ முழுத்திரை',
  'load.textures': 'அமைப்புகள் உருவாக்கப்படுகின்றன…', 'load.streets': 'புதுச்சேரி தெருக்கள் அமைக்கப்படுகின்றன…', 'load.city': 'வெள்ளை நகரம், தமிழ் நகர், கடற்கரைகள் கட்டப்படுகின்றன…',
  'load.sky': 'பாறை கடற்கரையில் சூரிய அஸ்தமனம் வரையப்படுகிறது…', 'load.people': 'ஆட்டோ ஓட்டுநர்கள் எழுப்பப்படுகிறார்கள்…', 'load.shaders': 'ஷேடர்கள் தொகுக்கப்படுகின்றன…', 'load.ready': 'தயார்!',
  'controls.title': 'கட்டுப்பாடுகள்', 'controls.foot': 'நடையில்', 'controls.driving': 'வாகனம் ஓட்டுதல்', 'controls.general': 'பொது',
  'c.move': 'நகர்', 'c.look': 'சுற்றிப் பார்', 'c.run': 'ஓடு', 'c.jump': 'குதி', 'c.crouch': 'குனி', 'c.punch': 'குத்து', 'c.enter': 'வாகனத்தில் ஏறு / இறங்கு / பறி',
  'c.interact': 'பேசு · டீ வாங்கு · பணி தொடங்கு', 'c.accel': 'வேகம் / பிரேக் & பின்னோக்கி', 'c.steer': 'திருப்பு', 'c.handbrake': 'கைப்பிரேக் (டிரிஃப்ட்!)', 'c.horn': 'ஹாரன்',
  'c.siren': 'காவல் சைரன் (காவல் வாகனம்)', 'c.zoom': 'கேமரா அருகு/தூரம்', 'c.map': 'வரைபடம் (வழிக்குறி அமைக்க கிளிக்)', 'c.garage': 'வாகனத் தேர்வு', 'c.rain': 'மழை ஆன்/ஆஃப்',
  'c.time': 'நேரத்தை வேகப்படுத்து', 'c.quick': 'விரைவு சேமி / ஏற்று', 'c.pause': 'இடைநிறுத்து',
  'settings.title': 'அமைப்புகள்', 'settings.quality': 'கிராஃபிக்ஸ் தரம்', 'settings.qHigh': 'உயர் (நிழல்கள், அதிக போக்குவரத்து)', 'settings.qMed': 'நடுத்தரம்', 'settings.qLow': 'குறைவு (வேகம்)',
  'settings.sens': 'மவுஸ் உணர்திறன்', 'settings.vol': 'ஒலி அளவு', 'settings.invert': 'மவுஸ் Y தலைகீழ்', 'settings.lang': 'மொழி / Language', 'settings.voices': 'கதாபாத்திரங்களின் தமிழ் குரல்', 'settings.scale': 'ரெண்டர் அளவு (அப்ஸ்கேலர்)', 'settings.fx': 'யதார்த்த விளைவுகள் (ஒளிர்வு, வண்ணம், பிரதிபலிப்பு)', 'settings.real': 'யதார்த்த 3D கதாபாத்திரங்கள் (அருகிலுள்ளவர்கள்)', 'settings.pixel': 'பிக்சல் கலை பாணி (தடித்த டெக்ஸ்சர், வெதுவெதுப்பான வண்ணம்)', 'p.shop': '{0} வாங்க <kbd>E</kbd> (₹{1})', 'shop.money': '{0} வாங்க பணம் போதவில்லை!', 'shop.ok': '{0}! +{1} ஆரோக்கியம் (−₹{2})', 'shop.flowers': 'புதிய {0} வாங்கினீர்கள் (−₹{1}). மணக்குது!', 'settings.radioVol': 'வானொலி ஒலி', 'c.radio': 'வானொலி நிலையம் மாற்று',
  'noTamilVoice': 'குறிப்பு: இந்த உலாவியில் தமிழ் குரல் இல்லை, எனவே உரையாடல் குமிழ்களில் மட்டும். தமிழ் பேச்சைக் கேட்க <b>Microsoft Edge</b>-இல் திறக்கவும்.',
  'radio.off': 'வானொலி அணைக்கப்பட்டது', 'radio.nomusic': 'உங்கள் MP3 பாடல்களை <b>music</b> கோப்புறையில் வையுங்கள்.', 'radio.mymusic': 'என் பாடல்கள்',
  'garage.title': 'வாகனத் தேர்வு', 'garage.sub': 'ஒரு வாகனத்தைத் தேர்ந்தெடுங்கள் — உங்கள் அருகில் கொண்டு வரப்படும்.', 'garage.close': 'மூடு (V)', 'garage.top': 'அதிகபட்ச வேகம் {0} கி.மீ/மணி',
  'map.head': 'புதுச்சேரி வரைபடம்', 'map.help': 'இடது கிளிக்: வழிக்குறி · வலது கிளிக்: நீக்கு · M / Esc: மூடு',
  'welcome.title': 'புதுச்சேரி', 'welcome.sub': 'கிழக்கின் பிரெஞ்சு ரிவியேராவிற்கு வரவேற்கிறோம்',
  'tutorial': '~y~இளஞ்சிவப்பு குறியில்~w~ நின்று <kbd>E</kbd> அழுத்தி முதல் பணியைத் தொடங்குங்கள். வாகனம் அருகில் <kbd>F</kbd> அழுத்தி ஏறுங்கள். கட்டுப்பாடுகளுக்கு <kbd>Esc</kbd>.',
  'saved': 'விளையாட்டு சேமிக்கப்பட்டது.', 'saved.auto': 'முன்னேற்றம் தானாக சேமிக்கப்பட்டது.', 'loaded': 'விளையாட்டு ஏற்றப்பட்டது.', 'saved.pause': 'சேமிக்கப்பட்டது!', 'nosave': 'சேமித்த விளையாட்டு இல்லை.',
  'pause.stats': 'பணம் ₹{0} · பணிகள் {1}/8 · பணப் பொதிகள் {2}<br>ஓட்டிய தூரம் {3} கி.மீ · நேரம் {4}',
  'delivered': 'உங்கள் {0} வந்துவிட்டது. ஏற <kbd>F</kbd> அழுத்துங்கள்.',
  'wasted': 'மரணம்!', 'busted': 'கைது!', 'hospitalBill': 'மருத்துவமனைக் கட்டணம்: ₹100', 'fine': 'அபராதம்: ₹100',
  'rain.on': 'பருவமழை வருகிறது…', 'rain.off': 'மழை நின்றுவிட்டது.',
  'stolenCop': 'நீங்கள் காவல் வாகனத்தைத் திருடினீர்கள்!', 'carjacked': 'வாகனம் பறிக்கப்பட்டது!',
  'chai.money': 'டீக்குப் பணம் போதவில்லை!', 'chai.full': 'நீங்கள் ஏற்கனவே மல்லிகைப் பூ போல் புத்துணர்வாக இருக்கிறீர்கள்.', 'chai.ok': 'சூடான டீ! +30 ஆரோக்கியம் (−₹10)',
  'wanted': 'தேடப்படும் நிலை {0}', 'lostCops': 'காவல்துறையிடமிருந்து தப்பினீர்கள்.',
  'found': '₹{0} கிடைத்தது! ({1}/{2} பொதிகள்)', 'health': '+50 ஆரோக்கியம்',
  'p.mission': 'பணியைத் தொடங்க <kbd>E</kbd>: <b>{0}</b>', 'p.enter': '{0} ஏற <kbd>F</kbd> அழுத்துங்கள்', 'p.jack': '{0} பறிக்க <kbd>F</kbd> அழுத்துங்கள்',
  'p.chai': 'டீ வாங்க <kbd>E</kbd> (₹10, +30 ஆரோக்கியம்)', 'p.talk': 'பேச <kbd>E</kbd> அழுத்துங்கள்', 'siren': '  [G] சைரன்',
  'outskirts': 'புதுச்சேரி புறநகர்',
  'mpass': 'பணி வெற்றி!', 'mfail': 'பணி தோல்வி!', 'mf.vehicle': 'வாகனம் அழிந்துவிட்டது.', 'mf.time': 'நேரம் முடிந்தது!',
  'mo.walkAayi': 'வாகனத்திலிருந்து இறங்கி ~y~ஆயி மண்டபத்திற்கு~w~ நடந்து செல்லுங்கள்.', 'mo.backAuto': 'மீண்டும் ~y~ஆட்டோவில்~w~ ஏறுங்கள்!', 'mo.stop': 'பயணி ஏற நிறுத்துங்கள்!',
  'mo.onboard': 'பயணி ஏறிவிட்டார்!', 'mo.backVeh': 'மீண்டும் உங்கள் வாகனத்தில் ஏறுங்கள்!', 'mo.cp': 'சோதனைச் சாவடி {0}/{1}',
  'v.car': 'கார்', 'v.taxi': 'மஞ்சள் டாக்ஸி', 'v.police': 'காவல் வாகனம்', 'v.auto': 'ஆட்டோ ரிக்ஷா', 'v.motorcycle': 'மோட்டார் சைக்கிள்', 'v.scooter': 'ஸ்கூட்டர்', 'v.bus': 'PRTC பேருந்து', 'v.cycle': 'சைக்கிள்', 'v.moped': 'மொபெட் 50', 'v.twostroke': '2-ஸ்ட்ரோக் 100', 'v.vintage': 'கிளாசிக் ஸ்கூட்டர்', 'v.commuter': 'கம்யூட்டர் 100', 'v.retro80': '80s ரெட்ரோ ஸ்கூட்டர்', 'v.flycar': 'நோவா ஸ்கை (பறக்கும் கார்)',
};

// Place names (districts / map labels)
const PLACES_TA = {
  'Rock Beach': 'பாறை கடற்கரை', 'Promenade Beach': 'புரொமனேட் கடற்கரை', 'Promenade': 'புரொமனேட்', 'Bharathi Park': 'பாரதி பூங்கா', 'Botanical Garden': 'தாவரவியல் பூங்கா',
  'Railway Station': 'ரயில் நிலையம்', 'Pondicherry Bus Stand': 'புதுச்சேரி பேருந்து நிலையம்', 'Bus Stand': 'பேருந்து நிலையம்', 'Grand Canal': 'பெரிய வாய்க்கால்',
  'White Town': 'வெள்ளை நகரம்', 'Paradise Beach': 'பாரடைஸ் கடற்கரை', 'Villianur': 'வில்லியனூர்', 'Tamil Quarter': 'தமிழ் நகர்', 'Ariyankuppam': 'அரியாங்குப்பம்',
  'Lawspet': 'லாஸ்பேட்டை', 'MG Road': 'எம்.ஜி. சாலை', 'Mission St': 'மிஷன் வீதி', 'Mission Street': 'மிஷன் வீதி', 'Goubert Avenue': 'கூபர் அவென்யூ', 'Nehru Street': 'நேரு வீதி',
  'Anna Salai': 'அண்ணா சாலை', 'Kamaraj Salai': 'காமராஜ் சாலை', 'Villianur Road': 'வில்லியனூர் சாலை', 'East Coast Road': 'கிழக்குக் கடற்கரைச் சாலை',
  'Bussy Street': 'புஸ்ஸி வீதி', 'Maraimalai Adigal Salai': 'மறைமலை அடிகள் சாலை', 'Bharathidasan Salai': 'பாரதிதாசன் சாலை', 'South Boulevard': 'தெற்கு பவுல்வார்டு',
  'North Boulevard': 'வடக்கு பவுல்வார்டு', 'West Boulevard': 'மேற்கு பவுல்வார்டு', 'Cuddalore Road': 'கடலூர் சாலை', 'Ariyankuppam Road': 'அரியாங்குப்பம் சாலை',
  'Gingee Salai': 'செஞ்சி சாலை', 'Subbiah Salai': 'சுப்பையா சாலை', 'Villianur Main Road': 'வில்லியனூர் மெயின் ரோடு', 'Temple Car Street': 'தேர் வீதி',
};

// Mission text (title, intro, step objectives) per language
export const MISSION_TEXT = {
  en: {
    welcome: { title: 'Welcome to Pondicherry', intro: 'Your cousin Selvam left you his old scooter on Goubert Avenue. Take a tour of White Town.',
      steps: ['Get on the ~y~scooter~w~ parked on Goubert Avenue.', 'Ride to ~y~Bharathi Park~w~ on Rue Dumas.', 'Get off and walk to the ~y~Aayi Mandapam~w~ monument.', 'Ride back to the ~y~Old Lighthouse~w~ on Goubert Avenue.'] },
    auto: { title: "Auto Anna's Night Shift", intro: 'Auto Anna has a fever. Drive his auto rickshaw and keep his customers happy!',
      steps: ["Get in ~y~Anna's auto rickshaw~w~.", 'Pick up the ~y~passenger~w~ on Maraimalai Adigal Salai.', 'Drop the passenger at the ~y~Railway Station~w~.', 'Pick up the ~y~nun~w~ at the Sacred Heart Basilica.', 'Take her to the ~y~Promenade~w~ on Goubert Avenue.'] },
    croissant: { title: 'Croissants at Dawn', intro: 'The Boulangerie needs fresh croissants delivered to five White Town cafés — hot!',
      steps: ['Hop on the ~y~delivery scooter~w~.', 'Deliver to all the ~y~cafés~w~ before they go cold!'] },
    temple: { title: 'Temple Run to Villianur', intro: 'The temple festival starts soon. Race the flower garlands to Villianur on a Bullet!',
      steps: ['Get on the ~y~motorcycle~w~.', 'Race through the ~y~checkpoints~w~ to Villianur temple!'] },
    hotsand: { title: 'Hot Sand', intro: 'A "business deal" at the Botanical Garden went wrong. The police are coming — get to Paradise Beach!',
      steps: ['Get in the ~y~getaway car~w~.', '', 'Escape to ~y~Paradise Beach~w~!', 'Lose the ~r~cops~w~.'] },
    train: { title: 'The Last Train', intro: 'Your friend left her ticket with you. Get to the Railway Station platform before the train leaves!',
      steps: ['Reach the ~y~Railway Station platform~w~!'] },
    bus: { title: 'PRTC Bus Duty', intro: 'The driver of the Villianur bus never showed up. Drive the route and bring the bus back in one piece.',
      steps: ['Get in the ~y~bus~w~.', 'Stop at every ~y~bus stop~w~ on the Villianur route.'] },
    patrol: { title: 'Beach Patrol', intro: 'Inspector Murugan needs a driver. Patrol the coast in a police car — official business, no wanted level.',
      steps: ['Get in the ~b~police car~w~.', 'Patrol ~y~Rock Beach~w~, the ~y~Promenade~w~ and ~y~Paradise Beach~w~.'] },
  },
  ta: {
    welcome: { title: 'புதுச்சேரிக்கு வரவேற்கிறோம்', intro: 'உங்கள் உறவினர் செல்வம் தனது பழைய ஸ்கூட்டரை கூபர் அவென்யூவில் விட்டுச் சென்றுள்ளார். வெள்ளை நகரத்தைச் சுற்றிப் பாருங்கள்.',
      steps: ['கூபர் அவென்யூவில் நிறுத்தியுள்ள ~y~ஸ்கூட்டரில்~w~ ஏறுங்கள்.', 'டூமா வீதியிலுள்ள ~y~பாரதி பூங்காவிற்குச்~w~ செல்லுங்கள்.', 'இறங்கி ~y~ஆயி மண்டபத்திற்கு~w~ நடந்து செல்லுங்கள்.', 'கடற்கரைச் சாலையிலுள்ள ~y~பழைய கலங்கரை விளக்கத்திற்குத்~w~ திரும்புங்கள்.'] },
    auto: { title: 'ஆட்டோ அண்ணாவின் இரவுப் பணி', intro: 'ஆட்டோ அண்ணாவுக்குக் காய்ச்சல். அவரது ஆட்டோவை ஓட்டி வாடிக்கையாளர்களை மகிழ்ச்சியாக வைத்திருங்கள்!',
      steps: ['~y~அண்ணாவின் ஆட்டோவில்~w~ ஏறுங்கள்.', 'மறைமலை அடிகள் சாலையில் ~y~பயணியை~w~ ஏற்றுங்கள்.', 'பயணியை ~y~ரயில் நிலையத்தில்~w~ இறக்கி விடுங்கள்.', 'திரு இருதய பசிலிக்காவில் ~y~அருட்சகோதரியை~w~ ஏற்றுங்கள்.', 'அவரை கூபர் அவென்யூ ~y~புரொமனேட்டிற்கு~w~ அழைத்துச் செல்லுங்கள்.'] },
    croissant: { title: 'விடியற்காலை குரோசான்கள்', intro: 'பேக்கரிக்கு வெள்ளை நகரத்தின் ஐந்து கஃபேக்களுக்கு சூடான குரோசான்களை அனுப்ப வேண்டும்!',
      steps: ['~y~டெலிவரி ஸ்கூட்டரில்~w~ ஏறுங்கள்.', 'ஆறுவதற்குள் அனைத்து ~y~கஃபேக்களுக்கும்~w~ கொண்டு சேருங்கள்!'] },
    temple: { title: 'வில்லியனூர் கோயில் ஓட்டம்', intro: 'கோயில் திருவிழா விரைவில் தொடங்குகிறது. புல்லட்டில் பூமாலைகளை வில்லியனூருக்குக் கொண்டு செல்லுங்கள்!',
      steps: ['~y~மோட்டார் சைக்கிளில்~w~ ஏறுங்கள்.', '~y~சோதனைச் சாவடிகள்~w~ வழியாக வில்லியனூர் கோயிலுக்கு விரையுங்கள்!'] },
    hotsand: { title: 'சூடான மணல்', intro: 'தாவரவியல் பூங்காவில் ஒரு "வியாபாரம்" தவறாகிவிட்டது. காவல்துறை வருகிறது — பாரடைஸ் கடற்கரைக்குத் தப்புங்கள்!',
      steps: ['~y~தப்பிக்கும் காரில்~w~ ஏறுங்கள்.', '', '~y~பாரடைஸ் கடற்கரைக்குத்~w~ தப்புங்கள்!', '~r~காவல்துறையிடமிருந்து~w~ தப்புங்கள்.'] },
    train: { title: 'கடைசி ரயில்', intro: 'உங்கள் தோழி தனது டிக்கெட்டை உங்களிடம் விட்டுச் சென்றாள். ரயில் புறப்படும் முன் நடைமேடைக்குச் செல்லுங்கள்!',
      steps: ['~y~ரயில் நிலைய நடைமேடையை~w~ அடையுங்கள்!'] },
    bus: { title: 'PRTC பேருந்துப் பணி', intro: 'வில்லியனூர் பேருந்தின் ஓட்டுநர் வரவில்லை. வழித்தடத்தை ஓட்டி பேருந்தைப் பத்திரமாகத் திரும்பக் கொண்டு வாருங்கள்.',
      steps: ['~y~பேருந்தில்~w~ ஏறுங்கள்.', 'வில்லியனூர் வழித்தடத்தின் ஒவ்வொரு ~y~பேருந்து நிறுத்தத்திலும்~w~ நிறுத்துங்கள்.'] },
    patrol: { title: 'கடற்கரை ரோந்து', intro: 'ஆய்வாளர் முருகனுக்கு ஓட்டுநர் தேவை. காவல் வாகனத்தில் கடற்கரையை ரோந்து செய்யுங்கள் — அதிகாரப்பூர்வப் பணி.',
      steps: ['~b~காவல் வாகனத்தில்~w~ ஏறுங்கள்.', '~y~பாறை கடற்கரை~w~, ~y~புரொமனேட்~w~ மற்றும் ~y~பாரடைஸ் கடற்கரையில்~w~ ரோந்து செய்யுங்கள்.'] },
  },
};

// NPC dialogue — everyday spoken Tamil (Pondicherry style), each as [Tamil, English meaning].
export const DIALOGUE = {
  greetMorning: [['காலை வணக்கம்!', 'Good morning!'], ['வணக்கம் சார், சாப்டீங்களா?', 'Hello sir, have you eaten?'], ['காபி குடிச்சீங்களா?', 'Had your coffee?']],
  greetEvening: [['மாலை வணக்கம்!', 'Good evening!'], ['வணக்கம்! பீச் போறீங்களா?', 'Hello! Going to the beach?'], ['சாயங்காலம் கடற்கரை சூப்பரா இருக்கும்.', 'The beach is lovely in the evening.']],
  greetNight: [['இவ்வளவு ராத்திரியில எங்க போறீங்க?', 'Where are you off to so late?'], ['பார்த்து போங்க, இருட்டா இருக்கு.', 'Go carefully, it is dark.']],
  chat: [
    ['என்ன விஷயம்? எப்படி இருக்கீங்க?', "What's up? How are you?"], ['நல்லா இருக்கீங்களா?', 'Are you doing well?'],
    ['வெள்ளை நகரத்து குரோசான் சாப்பிட்டுப் பாருங்க!', 'Try the croissants in White Town!'],
    ['பாரடைஸ் பீச்சுக்கு ECR ரோட்ல தெற்கே போங்க.', 'For Paradise Beach, go south on the ECR.'],
    ['இன்னைக்கு எம்.ஜி. ரோட்டுல ஒரே டிராஃபிக், மச்சான்.', 'So much traffic on MG Road today, machan.'],
    ['மணக்குள விநாயகர் கோயில் யானையைப் பார்த்தீங்களா?', 'Have you seen the Manakula Vinayagar temple elephant?'],
    ['டீயை விட ஃபில்டர் காபிதான் பெஸ்ட்!', 'Filter coffee beats tea!'], ['சூப்பர் சட்டை, சார்!', 'Super shirt, sir!'],
    ['ஆட்டோக்காரங்க மீட்டர் போடவே மாட்டாங்க!', 'Auto drivers never use the meter!'],
    ['பாண்டி மாதிரி ஊர் எங்கயும் இல்ல.', "There's no town like Pondy."], ['மீன் விலை ஏறிடுச்சு இந்த வாரம்.', 'Fish prices went up this week.'],
    ['சண்டே மார்க்கெட்டுக்கு வர்றீங்களா?', 'Coming to the Sunday market?'], ['பஸ் ஸ்டாண்ட் எந்தப் பக்கம் தெரியுமா?', 'Do you know which way the bus stand is?'],
  ],
  rain: [['மழை வருது, குடை எடுத்தீங்களா?', 'Rain is coming — got an umbrella?'], ['அய்யோ, நனைஞ்சிட்டேன்!', "Oh no, I'm soaked!"], ['இந்த மழை நிக்கவே நிக்காது போல.', 'This rain will never stop.']],
  honked: [['ஏய்! பார்த்து ஓட்டு!', 'Hey! Watch where you drive!'], ['ஹாரன் அடிக்காத, போறேன்!', "Stop honking, I'm moving!"], ['என்ன அவசரம்?', "What's the hurry?"]],
  bumped: [['பார்த்து போங்க!', 'Watch it!'], ['ஏய், என்ன இது?', 'Hey, what is this?'], ['கண்ணு தெரியலையா?', "Can't you see?"]],
  flee: [['ஐயோ!', 'Aiyo!'], ['காப்பாத்துங்க!', 'Help!'], ['ஓடுங்க!', 'Run!'], ['அம்மா!', 'Amma!']],
  angry: [['உன்னை விடமாட்டேன்!', "I won't let you go!"], ['வா, பார்த்துக்கலாம்!', "Come on, let's settle this!"]],
  cop: [['போங்க சார், போங்க.', 'Move along, sir.'], ['கவனமா ஓட்டுங்க, சரியா?', 'Drive carefully, okay?'], ['எல்லாம் சரியா இருக்கா?', 'Everything alright here?'], ['ஹெல்மெட் போடுங்க!', 'Wear a helmet!']],
  copChase: [['நில்லு! நில்லு!', 'Stop! Stop!'], ['போலீஸ்! ஓடாதே!', "Police! Don't run!"], ['கைதுசெய்யப்படுகிறாய்!', 'You are under arrest!']],
  vendorTea: [['டீ! சூடான டீ! பத்து ரூபா!', 'Tea! Hot tea! Ten rupees!'], ['காபி, டீ, வடை!', 'Coffee, tea, vadai!'], ['வாங்க சார், ஒரு டீ குடிங்க!', 'Come sir, have a tea!']],
  cricket: [['அடி! அடி! தூக்கி அடி!', 'Hit it! Hit it big!'], ['ஓடு! ஓடு! ரெண்டு ரன்!', 'Run! Run! Two runs!'], ['அவுட்! அவுட்!', 'Out! Out!'], ['சிக்ஸர்! சூப்பர்!', 'Sixer! Super!'], ['பந்தைப் போடு டா!', 'Bowl the ball, da!'], ['கேட்ச் பிடி!', 'Catch it!'], ['என் டர்ன் அடுத்தது!', 'My turn to bat next!']],
  fishermen: [['இழு! ஒண்ணா இழு!', 'Pull! Pull together!'], ['ஐலசா! ஐலசா!', 'Heave-ho! Heave-ho!'], ['இன்னிக்கு நல்ல மீன் பாடு!', 'Good catch today!'], ['வலையை மெதுவா இழு!', 'Pull the net slowly!']],
  vendorCart: [['சுண்டல்! சூடான சுண்டல்!', 'Sundal! Hot sundal!'], ['ஐஸ்கிரீம்! குல்ஃபி!', 'Ice cream! Kulfi!'], ['மாங்கா, தேங்கா, பட்டாணி சுண்டல்!', 'Raw mango, coconut, peas sundal!']],
  vendorPani: [['பானி பூரி! சூடான பானி பூரி!', 'Pani puri! Fresh pani puri!'], ['வாங்க அக்கா, காரமா பானி பூரி!', 'Come sister, spicy pani puri!'], ['மசாலா பூரி, பேல் பூரி இருக்கு!', 'Masala puri and bhel puri too!']],
  vendorBajji: [['சூடான பஜ்ஜி! மிளகாய் பஜ்ஜி!', 'Hot bajji! Chilli bajji!'], ['போண்டா, வடை, பஜ்ஜி!', 'Bonda, vadai, bajji!']],
  vendorCoconut: [['இளநீர்! குளுகுளு இளநீர்!', 'Tender coconut! Nice and cool!'], ['வெயிலுக்கு இளநீர் குடிங்க!', 'Drink tender coconut in this heat!']],
  vendorSugarcane: [['கரும்புச் சாறு! இஞ்சி எலுமிச்சை போட்டு!', 'Sugarcane juice! With ginger and lemon!'], ['ஃப்ரெஷ் ஜூஸ், இருபத்தஞ்சு ரூபா!', 'Fresh juice, twenty-five rupees!']],
  vendorFlowers: [['மல்லிகைப் பூ! முழம் இருபது ரூபா!', 'Jasmine! Twenty rupees a length!'], ['கனகாம்பரம், ரோஜா, மல்லி!', 'Firecracker flower, rose, jasmine!']],
  vendorFruits: [['மாம்பழம், வாழைப்பழம்! நல்ல பழம்!', 'Mangoes, bananas! Good fruit!'], ['சீசன் மாம்பழம் சார், சுவையா இருக்கும்!', 'Seasonal mangoes sir, very sweet!']],
  vendorCorn: [['சுட்ட சோளம்! எலுமிச்சை மிளகாய் தடவி!', 'Roasted corn! With lemon and chilli!'], ['சோளம் சூடா இருக்கு!', 'The corn is hot!']],
  thanks: [['ரொம்ப நன்றி!', 'Thank you very much!'], ['சரி, போயிட்டு வாங்க!', 'Okay, see you!']],
  promenade: [['கடல் காத்து எவ்வளவு நல்லா இருக்கு!', 'The sea breeze feels so good!'], ['காந்தி சிலை பக்கம் போலாமா?', 'Shall we go near the Gandhi statue?'], ['அலை இன்னைக்கு ரொம்ப பெருசா இருக்கு.', 'The waves are big today.']],
};
// Group conversations: [speaker index, line, subtitle (English meaning), voice language]
const T_ = (i, ta, en) => [i, ta, en, 'ta-IN'];
export const CONVOS = {
  couple: [
    [T_(0, 'அலை சத்தம் கேக்கும்போது எவ்வளவு அமைதியா இருக்கு...', 'Listening to the waves is so peaceful...'), T_(1, 'ஆமா. இங்க உன்கூட உட்காருறது எனக்கு ரொம்ப பிடிக்கும்.', 'Yes. I love sitting here with you.'), T_(0, 'நாளைக்கு காலையில சூரிய உதயம் பாக்க வருவோமா?', 'Shall we come tomorrow morning to see the sunrise?'), T_(1, 'அஞ்சு மணிக்கா? சரி, ஆனா நீ தான் எழுப்பணும்!', 'At five? Okay, but you have to wake me up!')],
    [T_(1, 'உனக்கு சுண்டல் வேணுமா?', 'Do you want some sundal?'), T_(0, 'சுண்டல் வேண்டாம், பானி பூரி சாப்பிடலாம்.', 'Not sundal, let us have pani puri.'), T_(1, 'சரி, ஆனா காரம் கம்மியா!', 'Okay, but less spicy!'), T_(0, 'நீ எப்பவுமே இதையே சொல்லுவ!', 'You always say that!')],
    [T_(0, 'கல்யாணத்துக்கு அப்புறமும் இப்படி பீச்சுக்கு வருவோமா?', 'Will we still come to the beach like this after the wedding?'), T_(1, 'கண்டிப்பா! ஒவ்வொரு ஞாயிறும்.', 'Definitely! Every Sunday.'), T_(0, 'பிராமிஸ்?', 'Promise?'), T_(1, 'பிராமிஸ்!', 'Promise!')],
    [T_(1, 'அந்த கப்பல் எங்க போகுதுன்னு தெரியுமா?', 'Do you know where that ship is going?'), T_(0, 'சென்னைக்கு இருக்கும். இல்லனா சிங்கப்பூர்!', 'Must be Chennai. Or Singapore!'), T_(1, 'ஒரு நாள் நாமளும் போகணும்.', 'Someday we should go too.')],
  ],
  boys: [
    [T_(0, 'மச்சான், பீச்ல ஒரு குரூப் செல்ஃபி எடுப்போமா?', 'Machan, shall we take a group selfie at the beach?'), T_(1, 'டேய், முதல்ல பானி பூரி சாப்பிடலாம்டா!', 'Dude, let us eat pani puri first!'), T_(2, 'பாரடைஸ் பீச்சுக்கு போட் எத்தனை மணிக்கு?', 'What time is the boat to Paradise Beach?'), T_(0, 'நாளைக்கு காலையில போலாம், இன்னைக்கு சும்மா சுத்தலாம்.', 'Let us go tomorrow morning, today we just roam.'), T_(3, 'சரி சரி, ராத்திரி வெள்ளை நகரத்துல ஒரு ரவுண்டு!', 'Okay okay, a round of White Town tonight!')],
    [T_(1, 'டேய், அந்த புல்லட்டைப் பாரு! செம்மையா இருக்கு.', 'Dude, look at that Bullet! It is awesome.'), T_(0, 'வாடகைக்கு எடுத்து ECR-ல ஓட்டலாமா?', 'Shall we rent one and ride on the ECR?'), T_(2, 'ஹெல்மெட் இல்லாம போனா போலீஸ் பிடிப்பாங்க!', 'The police will catch us without helmets!'), T_(3, 'ஹா ஹா, நீ எப்பவுமே பயந்தாங்கொள்ளி தான்!', 'Ha ha, you are always a scaredy-cat!')],
    [T_(2, 'ஹாஸ்டல்ல இருந்து தப்பிச்சு வந்தது வொர்த்டா!', 'Escaping the hostel was worth it, man!'), T_(0, 'வார்டன் போன் பண்ணா எடுக்காதீங்க!', 'Do not pick up if the warden calls!'), T_(1, 'அம்மா கேட்டா லைப்ரரில இருக்கேன்னு சொல்லு.', 'If mum asks, tell her I am in the library.')],
  ],
  girls: [
    [T_(0, 'இந்த மஞ்சள் வீடு செம்ம அழகு! ஒரு போட்டோ எடு!', 'This yellow house is so pretty! Take a photo!'), T_(1, 'இந்த இடம் ரீல்ஸ்க்கு சூப்பர்!', 'This spot is perfect for reels!'), T_(2, 'கஃபேல குரோசான் சாப்பிடலாமா?', 'Shall we have croissants at a café?'), T_(0, 'ஓகே, ஆனா அப்புறம் ஆரோவில் போகணும்!', 'Okay, but then we must go to Auroville!')],
    [T_(1, 'அய்யோ, காத்துல முடி எல்லாம் பறக்குது!', 'Oh no, the wind is messing up my hair!'), T_(2, 'பரவாயில்ல, போட்டோல நல்லா தான் இருக்கு.', 'It is fine, it looks nice in the photo.'), T_(0, 'மல்லிகைப் பூ வாங்கலாமா? இருபது ரூபா தான்.', 'Shall we buy jasmine? Only twenty rupees.'), T_(1, 'ஆமா, எல்லாருக்கும் ஒரு முழம்!', 'Yes, one length for everyone!')],
    [T_(2, 'நம்ம காலேஜ் டூர் இதுதான் பெஸ்ட்.', 'This is the best college trip.'), T_(0, 'அடுத்த வருஷம் கோவா போலாம்.', 'Next year let us go to Goa.'), T_(1, 'கோவா வேண்டாம், பாண்டி தான் ஃபேவரிட்!', 'Not Goa, Pondy is my favourite!')],
  ],
  family: [
    [T_(0, 'பசங்களா, கடல் பக்கம் தனியா போகாதீங்க!', 'Kids, do not go near the sea alone!'), T_(1, 'அப்பா, சுண்டல் வாங்கி தாங்க!', 'Dad, buy us sundal!'), T_(2, 'காந்தி சிலை கிட்ட ஒரு போட்டோ எடுக்கலாம்.', 'Let us take a photo near the Gandhi statue.'), T_(0, 'சரி, ஆனா ஏழு மணிக்குள்ள ஹோட்டலுக்கு போகணும்.', 'Okay, but we must reach the hotel by seven.')],
    [T_(1, 'அம்மா, ஐஸ்கிரீம்!', 'Mum, ice cream!'), T_(2, 'சாப்பாட்டுக்கு அப்புறம் தான்.', 'Only after dinner.'), T_(0, 'நாளைக்கு மணக்குள விநாயகர் கோயிலுக்கு போலாம்.', 'Tomorrow let us visit Manakula Vinayagar temple.')],
  ],
  tourists: [
    [[0, 'Look at these French street names — Rue Dumas, Rue Suffren!', '', 'en-GB'], [1, "It's like a little piece of France in India.", '', 'en-GB'], [0, 'Should we rent scooters and ride to Auroville tomorrow?', '', 'en-GB'], [1, 'Yes! And breakfast at that bakery first.', '', 'en-GB']],
    [[0, "C'est magnifique, la promenade au coucher du soleil !", 'The promenade is magnificent at sunset!', 'fr-FR'], [1, 'Oui, et la mer est si belle ici.', 'Yes, and the sea is so beautiful here.'], [0, 'On prend un café filtre ?', 'Shall we get a filter coffee?', 'fr-FR'], [1, "Bonne idée, j'adore le café ici !", 'Good idea, I love the coffee here!', 'fr-FR']],
    [[1, 'That lady sold me jasmine flowers for twenty rupees.', '', 'en-GB'], [0, 'Smells amazing. Where do we eat tonight?', '', 'en-GB'], [1, 'Someone said the fish curry on Beach Road is incredible.', '', 'en-GB'], [0, "Let's try it. I'm starving!", '', 'en-GB']],
  ],
};
// 2K kids: reels, selfies and hanging out by the bikes
CONVOS.girls.push(
  [T_(0, 'இந்த ட்ரெண்டிங் சாங்குக்கு ஒரு ரீல் போடலாம்!', 'Let us make a reel to this trending song!'), T_(1, 'லைட்டிங் செம்மையா இருக்கு, சன்செட் பின்னாடி!', 'The lighting is perfect with the sunset behind!'), T_(2, 'ஒன் மோர் டேக், நான் ஸ்டெப் மிஸ் பண்ணிட்டேன்!', 'One more take, I missed the step!'), T_(0, 'சரி, இந்த தடவை ஸ்லோ மோஷன்ல எடுக்கறேன்.', 'Okay, this time I will shoot in slow motion.'), T_(3, 'போஸ்ட் பண்ணதும் எல்லாரையும் டேக் பண்ணு!', 'Tag everyone once you post it!')],
  [T_(1, 'என் இன்ஸ்டா ஸ்டோரிக்கு காந்தி சிலை பேக்ரவுண்ட்!', 'Gandhi statue as the background for my Insta story!'), T_(2, 'ஃபில்டர் போடாதடி, நேச்சுரலா தான் அழகு.', 'Do not add a filter, it is prettier natural.'), T_(0, 'ஓகே பூமர்!', 'Okay boomer!'), T_(1, 'ஹா ஹா ஹா!', 'Ha ha ha!')],
  [T_(0, 'எல்லாரும் ஸ்மைல்! ஒன்... டூ... த்ரீ!', 'Everyone smile! One... two... three!'), T_(2, 'என் கண்ணு மூடிச்சு, இன்னொன்னு!', 'My eyes were closed, one more!'), T_(1, 'இது தான் ப்ரொஃபைல் பிக்!', 'This is my new profile pic!')],
);
CONVOS.boys.push(
  [T_(0, 'மச்சி, பைக்ல ECR-ல ஒரு லாங் ரைடு போலாமா?', 'Machi, shall we go for a long ride on the ECR?'), T_(1, 'பெட்ரோல் காசு யாரு குடுப்பா?', 'Who is paying for petrol?'), T_(2, 'எப்பவும் போல நான் தான் போல...', 'Me as usual, it seems...'), T_(3, 'அதான் நீ எங்க ஹீரோ டா!', "That's why you are our hero, man!")],
  [T_(1, 'டேய், நேத்து மேட்ச் பார்த்தியா? லாஸ்ட் ஓவர் செம்ம!', 'Dude, did you watch the match yesterday? The last over was crazy!'), T_(0, 'ஆமா மச்சி, சிக்ஸ் அடிச்சான் பாரு!', 'Yes machi, what a six he hit!'), T_(2, 'இந்த வீக்எண்ட் நாமளும் கிரிக்கெட் விளையாடலாம்.', 'Let us play cricket too this weekend.')],
  [T_(2, 'டீ குடிக்கலாமா? நான் ட்ரீட்!', 'Shall we have tea? My treat!'), T_(0, 'என்ன அதிசயம்! இன்னைக்கு மழை வரப்போகுது!', 'What a miracle! It is going to rain today!'), T_(1, 'சீக்கிரம் வா, அவன் மனசு மாறுறதுக்குள்ள!', 'Come quick, before he changes his mind!')],
  [T_(0, 'இங்கயே உட்கார்ந்து கடலைப் பார்த்துட்டு இருக்கலாம்டா.', 'Let us just sit here and watch the sea, man.'), T_(1, 'ஆமா, இது தான் பாண்டி வைப்.', 'Yes, this is the Pondy vibe.'), T_(2, 'எக்ஸாம் டென்ஷன் எல்லாம் போச்சு.', 'All the exam tension is gone.')],
);
// Original gaana-style lines (written for this game) that pullingo guys sing while walking
export const GAANA_LINES = [
  ['பாண்டி பீச்சு பக்கம் வாடா மச்சான்!', 'Come down to Pondy beach, machan!'],
  ['ஏரியா எங்க ஏரியா, ஸ்டைலு எங்க ஸ்டைலு!', 'Our area, our style!'],
  ['ஹேர் கலரு கோல்டு, மனசு மட்டும் ஓல்டு!', 'Hair colour gold, but my heart is old school!'],
  ['சோக்கா நடப்போம், சிங்கிளா சிரிப்போம்!', 'We walk in style, we smile single!'],
  ['டீ கடை வாசல்ல தான் எங்க மீட்டிங் பாயிண்ட்!', 'The tea shop is our meeting point!'],
  ['ECR ரோடுல பைக்கு, லைஃப்க்கு நூறு லைக்கு!', 'Bike on the ECR, a hundred likes for life!'],
  ['அலை அடிக்குது, பீட் அடிக்குது, நம்ம ஊரு பாண்டி டா!', 'Waves crashing, beat banging, this is our Pondy!'],
  ['செயின் போட்டு, ஷேட்ஸ் போட்டு, வெள்ளை நகரம் ரவுண்டு!', 'Chain on, shades on, a round of White Town!'],
];
export const REEL_LINES = [['ரெடியா? ஆக்ஷன்!', 'Ready? Action!'], ['ஸ்டார்ட் பண்றேன்... த்ரீ, டூ, ஒன்!', 'Starting... three, two, one!'], ['டான்ஸ் பண்ணுங்க, ரெக்கார்டிங்!', 'Dance, I am recording!']];
CONVOS.mixed = [...CONVOS.boys.slice(0, 1), ...CONVOS.girls.slice(0, 2)];
export function convo(kind) { const a = CONVOS[kind] || CONVOS.boys; return a[Math.floor(Math.random() * a.length)]; }

export function dialogue(ctx) { const a = DIALOGUE[ctx] || DIALOGUE.chat; return a[Math.floor(Math.random() * a.length)]; }

const DICT = { en: EN, ta: TA };

export function lang() { return G.settings.lang === 'ta' ? 'ta' : 'en'; }

export function t(key, ...args) {
  const d = DICT[lang()];
  let s = d[key] ?? EN[key] ?? key;
  args.forEach((a, i) => { s = s.split(`{${i}}`).join(a); });
  return s;
}

export function place(name) { return lang() === 'ta' ? (PLACES_TA[name] || name) : name; }
export function vlabel(type) { return t('v.' + type); }
export function missionText(id) { return MISSION_TEXT[lang()][id] || MISSION_TEXT.en[id]; }

/** Apply translations to static HTML (elements with data-i18n / data-i18n-html). */
export function applyStatic() {
  document.documentElement.lang = lang();
  document.body.classList.toggle('lang-ta', lang() === 'ta');
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
}
