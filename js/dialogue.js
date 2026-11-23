// Dialogue engine: every NPC gets a persona (name, personality, voice), lines are chosen by context
// (place, activity, time, weather) with per-NPC and town-wide memory so nothing repeats back-to-back,
// NPC-to-NPC conversations are assembled on the fly (opener -> replies -> close) with natural pauses,
// and the player gets different reactions depending on how they have treated this person before.
import { G } from './state.js';
import { DIALOGUE } from './i18n.js';

const r = (a) => a[Math.floor(Math.random() * a.length)];
const rand = (a, b) => a + Math.random() * (b - a);

/* ---------------- personas ---------------- */
const NAMES_M = [['முருகன்', 'Murugan'], ['செல்வம்', 'Selvam'], ['கார்த்திக்', 'Karthik'], ['அருண்', 'Arun'], ['பாலு', 'Balu'], ['ரவி', 'Ravi'], ['செந்தில்', 'Senthil'], ['குமார்', 'Kumar'], ['பிரகாஷ்', 'Prakash'], ['கோபால்', 'Gopal'], ['மணி', 'Mani'], ['ஆனந்த்', 'Anand'], ['தினேஷ்', 'Dinesh'], ['சுரேஷ்', 'Suresh'], ['ராஜா', 'Raja'], ['வேலு', 'Velu'], ['சதீஷ்', 'Sathish'], ['இளங்கோ', 'Ilango']];
const NAMES_F = [['லட்சுமி', 'Lakshmi'], ['பிரியா', 'Priya'], ['மீனா', 'Meena'], ['காவ்யா', 'Kavya'], ['திவ்யா', 'Divya'], ['சரண்யா', 'Saranya'], ['ரேவதி', 'Revathi'], ['அனிதா', 'Anitha'], ['மலர்', 'Malar'], ['ஜனனி', 'Janani'], ['தீபா', 'Deepa'], ['சாந்தி', 'Shanthi'], ['கலா', 'Kala'], ['வள்ளி', 'Valli'], ['நந்தினி', 'Nandhini']];
const NAMES_KID = [['அஸ்வின்', 'Ashwin'], ['கவின்', 'Kavin'], ['நிலா', 'Nila'], ['யாழினி', 'Yazhini'], ['தமிழ்', 'Tamizh'], ['சூர்யா', 'Surya'], ['மித்ரா', 'Mithra'], ['ஆதி', 'Aadhi']];
const NAMES_TOURIST = [['சாரா', 'Sarah'], ['லூக்', 'Luc'], ['எம்மா', 'Emma'], ['டேனியல்', 'Daniel'], ['க்ளாரா', 'Clara'], ['ஜூலியன்', 'Julien']];
export const TYPES = {
  cheerful:    { smile: 0.7, rate: 1.08, pitch: 0.06, chatty: 1.0 },
  grumpy:      { smile: 0.0, rate: 0.92, pitch: -0.08, chatty: 0.6 },
  shy:         { smile: 0.25, rate: 0.95, pitch: 0.03, chatty: 0.35 },
  chatty:      { smile: 0.5, rate: 1.12, pitch: 0.02, chatty: 1.4 },
  joker:       { smile: 0.85, rate: 1.05, pitch: 0.04, chatty: 1.1 },
  philosopher: { smile: 0.3, rate: 0.88, pitch: -0.05, chatty: 0.8 },
  worried:     { smile: 0.05, rate: 1.0, pitch: 0.05, chatty: 0.8 },
  foodie:      { smile: 0.6, rate: 1.02, pitch: 0.0, chatty: 1.0 },
};
let _pid = 0;
const recentNames = [];
/** Stable identity for a person: name, personality, voice; created on first use. */
export function persona(p) {
  if (p.persona) return p.persona;
  const L = (p.h && p.h.look) || {}, kid = L.h && L.h < 0.8;
  const type = kid ? r(['cheerful', 'chatty', 'joker', 'shy']) : r(Object.keys(TYPES));
  const list = kid ? NAMES_KID : L.tourist || p.isTourist ? NAMES_TOURIST : L.female ? NAMES_F : NAMES_M;
  const fresh = list.filter((n) => !recentNames.includes(n[1])), name = r(fresh.length ? fresh : list);
  recentNames.push(name[1]); if (recentNames.length > 10) recentNames.shift();   // no two neighbours with the same name
  const T = TYPES[type];
  p.persona = { id: ++_pid, name, type, kid, smile: T.smile, recent: [], met: 0, lastMet: -1e9, hurt: 0, topicsUsed: [] };
  if (p.h) p.h.smile = T.smile * 0.7;
  if (p.voice) { p.voice.pitchJ = (p.voice.pitchJ || 0) * 0.5 + T.pitch + (kid ? 0.25 : 0); p.voice.rate = T.rate * (kid ? 1.08 : 1); }
  return p.persona;
}

/* ---------------- line pools (Tamil, English) ---------------- */
const X = {
  cafe: [['இந்த ஃபில்டர் காபி அருமையா இருக்கு!', 'This filter coffee is wonderful!'], ['குரோசான் சூடா இருக்கு, சாப்பிட்டுப் பாரு.', 'The croissant is warm, try it.'], ['கடலைப் பார்த்துக்கிட்டே காபி குடிக்கறது சுகம்.', 'Coffee with a sea view is bliss.'], ['பில் யாரு கட்டப்போறா இன்னைக்கு?', 'Who is paying the bill today?'], ['கோல்ட் காபியில இனிப்பு கொஞ்சம் அதிகம்.', 'The cold coffee is a bit too sweet.'], ['இன்னொரு மசாலா டீ சொல்லலாமா?', 'Shall we order one more masala tea?'], ['இங்க க்ரேப் ரொம்ப ஃபேமஸ்.', 'The crêpes here are famous.'], ['சர்வீஸ் கொஞ்சம் ஸ்லோ, ஆனா பரவாயில்ல.', "Service is a bit slow, but it's fine."], ['போன தடவை பீட்சா சாப்பிட்டேன், சூப்பர்!', 'I had the pizza last time, super!'], ['சர்க்கரை கம்மியா போடச் சொல்லு.', 'Ask them to go easy on the sugar.'], ['காத்து அடிக்குது, கப்பைப் பிடிச்சுக்கோ!', "It's windy, hold your cup!"], ['சாயங்காலம் இங்க கூட்டம் அதிகமா இருக்கும்.', 'It gets crowded here in the evening.'], ['லெமன் சோடா ரொம்ப ஃப்ரெஷ்ஷா இருக்கு.', 'The lemon soda is really fresh.'], ['அடுத்த வாரம் மறுபடியும் இங்க வரலாம்.', "Let's come here again next week."], ['இந்த கேக்கை வீட்டுக்கு பார்சல் வாங்கலாமா?', 'Shall we take this cake home as a parcel?'], ['பேசிக்கிட்டே இருந்ததுல காபி ஆறிப்போச்சு!', 'We talked so much the coffee went cold!'], ['வெயிட்டர் அண்ணா, இன்னொரு கப் ப்ளீஸ்!', 'Waiter, one more cup please!'], ['இந்த மெனுல புதுசா என்ன இருக்கு?', "What's new on this menu?"]],
  beach: [['அலை இன்னைக்கு பெருசா இருக்கு!', 'The waves are big today!'], ['கால் நனைக்கலாம் வா, ஆனா ரொம்ப உள்ள போகாத.', "Come wet your feet, but don't go too far in."], ['சூரியன் உதிக்கறதைப் பார்க்க காலையிலேயே வரணும்.', 'You have to come early to see the sunrise.'], ['கடல் காத்து உடம்புக்கு நல்லது.', 'Sea breeze is good for the body.'], ['அந்த மீன்பிடி படகைப் பாரு!', 'Look at that fishing boat!'], ['மணல்ல நடக்கறது கஷ்டமா இருக்கு.', 'Walking on the sand is hard work.'], ['அந்தப் பசங்க கிரிக்கெட் நல்லா ஆடுறாங்க.', 'Those kids play good cricket.'], ['கடல் இன்னைக்கு செம நீலமா இருக்கு.', 'The sea is such a deep blue today.'], ['பின்னாடி கடல் வர்ற மாதிரி ஒரு செல்ஃபி எடுப்போம்.', "Let's take a selfie with the sea behind."], ['பழைய பாலம் உடைஞ்சு கிடக்கு, பாவம்.', 'The old pier lies broken, such a pity.'], ['கடற்பறவைகள் படகைச் சுத்திப் பறக்குது பாரு.', 'See the gulls circling the boat.'], ['அலை சத்தம் கேட்டா மனசு அமைதியாகுது.', 'The sound of the waves calms the mind.'], ['பாறை மேல ஏறாதீங்க, வழுக்கும்!', "Don't climb the rocks, they're slippery!"], ['சாயங்காலம் இங்க குளிர்ச்சியா இருக்கும்.', 'It gets cool here in the evening.'], ['காந்தி சிலை வரைக்கும் நடக்கலாமா?', 'Shall we walk to the Gandhi statue?'], ['மணல்ல கால் தடம் எவ்வளவு இருக்கு பாரு.', 'Look at all the footprints in the sand.'], ['அலை வந்து செருப்பை இழுத்துட்டுப் போயிடும்!', 'A wave will carry your slipper away!']],
  cricket: [['நான் பேட்டிங், நீ பௌலிங்!', 'I bat, you bowl!'], ['பந்து கடலுக்குள்ள போனா அவுட்!', "If the ball goes in the sea, you're out!"], ['மெதுவா போடு டா, நான் சின்னப் பையன்!', "Bowl slowly, I'm small!"], ['அது நோ-பால்!', 'That was a no-ball!'], ['ஸ்கோர் என்ன? பத்து ஆச்சா?', "What's the score? Ten yet?"], ['அம்மா கூப்பிடறதுக்குள்ள இன்னொரு ஓவர்!', 'One more over before mum calls!'], ['கேட்சை விட்டுட்டியே டா!', 'You dropped the catch!'], ['பெரிய ஷாட் அடிக்கிறேன் பாரு!', 'Watch me hit a big shot!'], ['கீப்பர், கொஞ்சம் பின்னாடி போ!', 'Keeper, step back a bit!'], ['அடுத்தது என் பௌலிங் டர்ன்!', "Next it's my turn to bowl!"], ['பந்து மணல்ல புதைஞ்சுடுச்சு!', 'The ball got buried in the sand!'], ['ஸ்டம்ப் கோணலா இருக்கு, சரி பண்ணு.', 'The stumps are crooked, fix them.']],
  fishermen: [['காலைல நாலு மணிக்கே கடலுக்கு வந்துட்டோம்.', 'We were out at sea by four this morning.'], ['இன்னைக்கு காத்து தெற்கிருந்து அடிக்குது.', 'The wind is from the south today.'], ['வஞ்சிரம் கிடைச்சா நல்ல விலை போகும்.', 'Seer fish would fetch a good price.'], ['மேகம் கருக்குது, சீக்கிரம் கரைக்குப் போவோம்.', "Clouds are darkening, let's head in soon."], ['வலையில ஓட்டை, நாளைக்கு தைக்கணும்.', "There's a hole in the net, must mend it tomorrow."], ['டீசல் விலை ஏறிக்கிட்டே போகுது.', 'Diesel prices keep going up.'], ['ஐயோ, நண்டு வலையில மாட்டிக்கிச்சு!', 'Aiyo, a crab got caught in the net!'], ['மீனை ஐஸ் பெட்டியில போடு, வெயில் அதிகம்.', "Put the fish in the ice box, it's hot."], ['எட்டு மணிக்குள்ள மார்க்கெட்டுக்குப் போகணும்.', 'Must reach the market by eight.'], ['கடல் அம்மா இன்னைக்கு கருணை காட்டினா.', 'Mother Sea was kind to us today.'], ['அலை அமைதியா இருக்கு, நல்ல நாள்.', 'The sea is calm, a good day.'], ['மத்தி மீன் கூட்டம் வருது பாரு!', 'Look, a shoal of sardines is coming!']],
  whitetown: [['இந்த பிரெஞ்சு வீடுகள் எவ்வளவு அழகு!', 'These French houses are so beautiful!'], ['மஞ்சள் சுவர் முன்னாடி ஒரு போட்டோ எடு.', 'Take a photo in front of the yellow wall.'], ['பிரெஞ்சுல எழுதின தெரு பேர் பலகையைப் பாரு.', 'Look at the street name boards in French.'], ['சுவர் மேல பூகன்வில்லா பூ எவ்வளவு அழகு.', 'The bougainvillea on the walls is lovely.'], ['அந்த பேக்கரில பகெட் ஃப்ரெஷ்ஷா கிடைக்கும்.', 'That bakery has fresh baguettes.'], ['இங்க சைக்கிள் வாடகைக்கு எடுக்கலாம்.', 'You can hire a bicycle here.'], ['சர்ச் மணி சத்தம் கேட்டீங்களா?', 'Did you hear the church bell?'], ['நடந்து சுத்திப் பார்க்கத்தான் இது பெஸ்ட் இடம்.', 'Best place to explore on foot.']],
  night: [['இவ்வளவு லேட்டா கடற்கரை அமைதியா இருக்கு.', 'The beach is so quiet this late.'], ['நிலா வெளிச்சத்துல கடல் மின்னுது.', 'The sea shimmers in the moonlight.'], ['வீட்டுக்குப் போகணும், நாளைக்கு வேலை இருக்கு.', 'Must go home, work tomorrow.']],
  playerHello: [['வணக்கம்!', 'Hello!'], ['எப்படி இருக்கீங்க?', 'How are you?'], ['ஹாய்!', 'Hi!'], ['ஒரு நிமிஷம் பேசலாமா?', 'Got a minute?'], ['என்ன நடக்குது இங்க?', "What's going on here?"]],
  meetFirst: [['வணக்கம்! நான் {name}. நீங்க இந்த ஊருக்குப் புதுசா?', "Hello! I'm {name}. Are you new in town?"], ['ஹலோ! என் பேர் {name}. பாண்டிக்கு வரவேற்கிறேன்!', 'Hello! My name is {name}. Welcome to Pondy!'], ['வணக்கம், நான் {name}. என்ன வேணும் சொல்லுங்க?', "Hello, I'm {name}. What can I do for you?"], ['ஓ, வணக்கம்! என்னை {name}னு கூப்பிடுவாங்க.', 'Oh, hello! People call me {name}.']],
  meetAgain: [['ஓ, நீங்களா! மறுபடியும் சந்திச்சுட்டோம்.', 'Oh, you again! We meet once more.'], ['நான் தான் {name}, ஞாபகம் இருக்கா?', "It's me, {name}, remember?"], ['மறுபடியும் வணக்கம்! எப்படிப் போகுது?', "Hello again! How's it going?"]],
  meetFriend: [['வா நண்பா! இன்னைக்கு என்ன ப்ளான்?', "Come, my friend! What's the plan today?"], ['நாம ரெண்டு பேரும் ஃப்ரெண்ட்ஸ் ஆயிட்டோம் போல!', 'Looks like we have become friends!'], ['உங்களைப் பார்க்காம என் நாள் போகாது போல!', 'Seems my day is not complete without seeing you!']],
  meetJustNow: [['இப்பதானே பேசினோம்!', 'We just talked!'], ['இன்னும் ஏதாவது வேணுமா?', 'Need something else?'], ['ஏதாவது மறந்துட்டீங்களா?', 'Did you forget something?'], ['மறுபடியுமா? சரி, சொல்லுங்க.', 'Again? Okay, tell me.']],
  meetScared: [['ஐயோ, போலீஸ் உங்களைத் தேடுது! தள்ளிப் போங்க!', 'Aiyo, the police are after you! Keep away!'], ['உங்ககிட்ட பேச பயமா இருக்கு.', "I'm scared to talk to you."], ['என்னை எதுலயும் மாட்டி விடாதீங்க!', "Don't drag me into your trouble!"]],
  meetAngry: [['நீ தானே என்னை அடிச்ச! போ இங்கிருந்து!', 'You are the one who hit me! Get lost!'], ['உன்கிட்ட பேச மாட்டேன்.', "I won't talk to you."], ['இன்னொரு தடவை கை வச்சா போலீஸைக் கூப்பிடுவேன்!', "Touch me again and I'll call the police!"]],
  vendorRegular: [['வாங்க வாங்க! வழக்கம் போலவா?', 'Come, come! The usual?'], ['மறுபடியும் வந்துட்டீங்களா! இன்னைக்கு ஸ்பெஷல் இருக்கு.', "Back again! There's a special today."], ['நம்ம ரெகுலர் கஸ்டமர்! உங்களுக்கு ஸ்பெஷல் விலை.', 'Our regular customer! Special price for you.']],
  kidToPlayer: [['அண்ணா, எங்களோட விளையாட வர்றீங்களா?', 'Anna, want to play with us?'], ['அண்ணா, அந்தப் பந்தை எடுத்துக் குடுங்க!', 'Anna, throw that ball back!'], ['நீங்க பேட்டிங் பண்ணுவீங்களா?', 'Can you bat?']],
  ack: [['ஆமா, சரியா சொன்னீங்க!', 'Yes, exactly!'], ['அப்படியா? நிஜமாவா?', 'Really? Truly?'], ['ஹாஹா, செம!', 'Haha, brilliant!'], ['ம்ம், நானும் அதையே நினைச்சேன்.', 'Mm, I was thinking the same.'], ['அது உண்மைதான்.', "That's true."], ['விடு, பார்த்துக்கலாம்.', "Leave it, we'll see."], ['சரியாப் போச்சு!', 'Fair enough!']],
  close: [['சரி, அப்புறம் பேசலாம்.', 'Okay, talk later.'], ['வா, கொஞ்சம் நடக்கலாம்.', "Come, let's walk a bit."], ['நேரம் போனதே தெரியல!', "Didn't notice the time fly!"], ['சரி சரி, கிளம்பலாம்.', "Okay okay, let's go."]],
};
const BY_TYPE = {
  chat: {
    cheerful: [['இன்னைக்கு நாள் சூப்பரா போகுது!', 'Today is going great!'], ['சிரிச்சுக்கிட்டே இருங்க, எல்லாம் நல்லா நடக்கும்!', 'Keep smiling, all will be well!']],
    grumpy: [['இந்த வெயில் தாங்க முடியல.', "I can't stand this heat."], ['எல்லாமே விலை ஏறிப்போச்சு.', 'Everything has got expensive.'], ['இந்த ஹாரன் சத்தம் தலைவலி.', 'This honking gives me a headache.']],
    shy: [['ம்ம்... சரி.', 'Mm... okay.'], ['நான் கொஞ்சம் அவசரத்துல இருக்கேன்.', "I'm in a bit of a hurry."]],
    chatty: [['தெரியுமா, என் மாமா பையனுக்கு அடுத்த மாசம் கல்யாணம்!', 'You know, my cousin is getting married next month!'], ['நேத்து நடந்த கதையைக் கேளுங்க...', 'Listen to what happened yesterday...'], ['எங்க தெருவுல புதுசா ஒரு டீக்கடை திறந்திருக்காங்க.', 'A new tea shop opened on our street.']],
    joker: [['என் பைக் என்னை விட வேகமா ஓடும், ஆனா பெட்ரோல் தான் இல்ல!', 'My bike is faster than me, but it has no petrol!'], ['டயட்ல இருக்கேன், அதனால ரெண்டு பஜ்ஜி மட்டும்!', "I'm on a diet, so only two bajjis!"]],
    philosopher: [['கடல் மாதிரிதான் வாழ்க்கை — அலை வரும், போகும்.', 'Life is like the sea — waves come and go.'], ['அவசரப்படாதீங்க, எல்லாம் நேரத்துக்கு நடக்கும்.', "Don't rush, everything happens in its time."]],
    worried: [['பையன் இன்னும் வீட்டுக்கு வரல, கவலையா இருக்கு.', "My son isn't home yet, I'm worried."], ['மழை வந்தா காயப்போட்ட துணி நனைஞ்சுடும்.', 'If it rains, the washing will get wet.']],
    foodie: [['இங்க பக்கத்துல நல்ல பிரியாணிக் கடை தெரியுமா?', 'Know a good biryani place nearby?'], ['சாப்பிட்டு எவ்வளவு நேரம் ஆச்சு!', "It's been ages since I ate!"]],
  },
  ack: {
    grumpy: [['ம்ம்... என்னமோ.', 'Hmm... whatever.'], ['எனக்கு அப்படித் தோணல.', "I don't think so."]],
    cheerful: [['சூப்பர்! சூப்பர்!', 'Super! Super!'], ['வாவ், நல்லா இருக்கே!', 'Wow, that is nice!']],
    joker: [['ஹாஹா, நீ ஒரு ஜோக்கர் டா!', "Haha, you're such a joker!"]],
    shy: [['ம்ம்...', 'Mm...'], ['சரி...', 'Okay...']],
    philosopher: [['எல்லாத்துக்கும் ஒரு காரணம் இருக்கு.', 'Everything has a reason.']],
  },
};

/* ---------------- memory-aware line selection ---------------- */
const globalRecent = [];   // last lines spoken anywhere in town (by id)
function pool(ctx, P) {
  let src = [...(X[ctx] || []), ...(DIALOGUE[ctx] || [])]; if (!src.length) src = DIALOGUE.chat;
  const base = src.map((l, i) => [ctx + ':' + i, l]);
  const extra = (BY_TYPE[ctx] && BY_TYPE[ctx][P.type]) || [];
  return extra.length ? base.concat(extra.map((l, i) => [ctx + ':' + P.type + ':' + i, l]), extra.map((l, i) => [ctx + ':' + P.type + ':' + i, l])) : base;
}
/** Pick a fresh line for this person: never one they said recently, rarely one anybody nearby just said. */
export function line(p, ctx) {
  const P = persona(p), all = pool(ctx, P);
  let cand = all.filter(([id]) => !P.recent.includes(id) && !globalRecent.includes(id));
  if (!cand.length) cand = all.filter(([id]) => !P.recent.includes(id));
  if (!cand.length) cand = all;
  const [id, l] = r(cand);
  P.recent.push(id); if (P.recent.length > 12) P.recent.shift();
  globalRecent.push(id); if (globalRecent.length > 40) globalRecent.shift();
  return fill(l, P);
}
function fill(l, P) { return l[0].includes('{name}') ? [l[0].replace('{name}', P.name[0]), l[1].replace('{name}', P.name[1])] : l; }

/** What this person would naturally talk about right now, from where they are and what they are doing. */
export function contextFor(p) {
  const h = G.env ? G.env.hour : 12, x = p.pos.x, z = p.pos.z;
  if (p.state === 'cricket') return 'cricket';
  if (p.chair) return 'cafe';
  if (p.fisher) return 'fishermen';
  if (G.env && G.env.rain > 0.5 && Math.random() < 0.5) return 'rain';
  if ((h > 21.5 || h < 4.5) && Math.random() < 0.4) return 'night';
  if (x > 495 && z > -460 && z < 310) return Math.random() < 0.75 ? 'beach' : 'chat';
  if (x > 300 && x < 495 && z > -460 && z < 0) return Math.random() < 0.6 ? 'whitetown' : 'chat';
  return 'chat';
}

/* ---------------- speaking: bubble + voice + mouth ---------------- */
export function speak(p, l, secs, lang = 'ta-IN') {
  const dur = secs || Math.min(5.5, 1.8 + l[0].length * 0.05);
  G.hud && G.hud.speech(p, l, dur);
  if (p.h) { p.h.speakUntil = (G.time || 0) + Math.min(dur * 0.85, 0.6 + l[0].length * 0.07); p.h.smileBoost = /ஹா|ha|!$/i.test(l[1] || '') ? 1 : 0; }
  const pp = G.player.worldPos(), d = Math.hypot(pp.x - p.pos.x, pp.z - p.pos.z);
  if (G.speech) lang.startsWith('ta') ? G.speech.say(l[0], p.voice || {}, d, false) : G.speech.sayOther(l[0], p.voice || {}, d, false, lang);
  return dur;
}

/* ---------------- NPC-to-NPC conversations ---------------- */
/**
 * A conversation is assembled when it starts: the first speaker opens with a topic line for the place,
 * others answer with their own line or a reaction in their personality, turns alternate with short
 * thinking pauses, and it ends with a closing line. Groups then rest for a while before talking again.
 */
export class Conversations {
  constructor() { this.list = []; }
  busy(p) { return this.list.some((c) => c.members.includes(p)); }
  interrupt(p) { this.list = this.list.filter((c) => !c.members.includes(p)); }
  start(members, ctx, opts = {}) {
    members = members.filter((m) => m && !m.dead && (m.keepBubble || G.peds.includes(m)));
    if (members.length < 2 || members.some((m) => this.busy(m)) || members.some((m) => (m.cvCD || 0) > G.time)) return false;
    const turns = [], n = 3 + Math.floor(Math.random() * 3);
    let sp = Math.floor(Math.random() * members.length);
    for (let i = 0; i < n; i++) {
      const who = members[sp], P = persona(who);
      let kind = i === 0 ? ctx : i === n - 1 && Math.random() < 0.6 && !opts.noClose ? 'close' : Math.random() < 0.45 * TYPES[P.type].chatty ? ctx : 'ack';
      if (kind === 'ack' && BY_TYPE.ack[P.type] && Math.random() < 0.6) kind = 'ackT';
      turns.push({ who, kind });
      sp = (sp + 1 + Math.floor(Math.random() * (members.length - 1))) % members.length;
    }
    this.list.push({ members, ctx, turns, i: 0, t: rand(0.3, 1.2), lang: opts.lang });
    return true;
  }
  update(dt) {
    for (let k = this.list.length - 1; k >= 0; k--) {
      const c = this.list[k]; c.t -= dt;
      if (c.members.some((m) => m.dead || (!m.keepBubble && !G.peds.includes(m)))) { this.list.splice(k, 1); continue; }
      if (c.t > 0) continue;
      if (c.i >= c.turns.length) { for (const m of c.members) { m.cvCD = G.time + rand(18, 45) / TYPES[persona(m).type].chatty; m.lookAt = null; } this.list.splice(k, 1); continue; }
      const tr = c.turns[c.i++], P = persona(tr.who);
      const l = tr.kind === 'ackT' ? fill(r(BY_TYPE.ack[P.type]), P) : line(tr.who, tr.kind);
      const dur = speak(tr.who, l);
      for (const m of c.members) if (m !== tr.who) m.lookAt = tr.who;   // listeners turn to the speaker
      tr.who.lookAt = c.members.find((m) => m !== tr.who) || null;
      c.t = dur * 0.8 + rand(0.35, 1.3);    // a beat to think before the next person answers
    }
  }
}

/* ---------------- the player talks to someone ---------------- */
/** Returns the reaction lines in order: the player's own greeting, the NPC's reply that depends on history, then small talk. */
export function playerChat(p) {
  const P = persona(p), now = G.time || 0, wanted = G.police && G.police.stars > 0;
  const out = [];
  out.push(['player', fill(r(X.playerHello), P)]);
  let reply;
  if (P.hurt > 0) reply = line(p, 'meetAngry');
  else if (wanted && Math.random() < 0.7) reply = line(p, 'meetScared');
  else if (now - P.lastMet < 45) reply = line(p, 'meetJustNow');
  else if (p.state === 'cricket' || P.kid) reply = line(p, 'kidToPlayer');
  else if (p.state === 'vendor' && P.met > 0) reply = line(p, 'vendorRegular');
  else if (P.met === 0) reply = line(p, 'meetFirst');
  else if (P.met >= 3) reply = line(p, 'meetFriend');
  else reply = line(p, 'meetAgain');
  out.push(['npc', reply]);
  if (P.hurt <= 0 && !(now - P.lastMet < 45)) out.push(['npc', line(p, p.state === 'vendor' ? (p.callCtx || 'vendorTea') : contextFor(p))]);
  P.met++; P.lastMet = now;
  return out;
}
