// ============================================================
//  js/forms.js  —  Tagbi GeoGuard (Fixed)
//  Changes:
//   - Report submission now uses window.authFetch()
//   - Description field properly validated as required
// ============================================================

import { clearRadiusCircle, drawRadiusCircle, reportPin } from './map.js';

export const boholBarangays = {
    "Albuquerque": ["Bahi", "Basacdacu", "Cantiguib", "Dangay", "East Poblacion", "Ponong", "San Agustin", "Santa Filomena", "Tagbuane", "Toril", "West Poblacion"],
    "Alicia": ["Cabatang", "Cagongcagong", "Cambaol", "Cayacay", "Del Monte", "Katipunan", "La Hacienda", "Mahayag", "Napo", "Pagahat", "Poblacion", "Progreso", "Putlongcam", "Sudlon", "Untaga"],
    "Anda": ["Almaria", "Bacong", "Badiang", "Buenasuerte", "Candabong", "Casica", "Katipunan", "Linawan", "Lundag", "Poblacion", "Santa Cruz", "Suba", "Talisay", "Tanod", "Tawid", "Virgen"],
    "Antequera": ["Angilan", "Bantolinao", "Bicahan", "Bitaugan", "Bungahan", "Can-Omay", "Canlaas", "Cansibuan", "Celing", "Danao", "Danicop", "Mag-Aso", "Poblacion", "Quinapon-An", "Santo Rosario", "Tabuan", "Tagubaas", "Tupas", "Ubojan", "Viga", "Villa Aurora"],
    "Baclayon": ["Buenaventura", "Cambanac", "Dasitam", "Guiwanon", "Landican", "Laya", "Libertad", "Montana", "Pamilacan", "Payahan", "Poblacion", "San Isidro", "San Roque", "San Vicente", "Santa Cruz", "Taguihon", "Tanday"],
    "Balilihan": ["Baucan Norte", "Baucan Sur", "Boctol", "Boyog Norte", "Boyog Proper", "Boyog Sur", "Cabad", "Candasig", "Cantalid", "Cantomimbo", "Cogon", "Datag Norte", "Datag Sur", "Del Carmen Este", "Del Carmen Norte", "Del Carmen Sur", "Del Carmen Weste", "Del Rosario", "Dorol", "Haguilanan Grande", "Hanopol Este", "Hanopol Norte", "Hanopol Weste", "Magsija", "Maslog", "Sagasa", "Sal-Ing", "San Isidro", "San Roque", "Santo Niño", "Tagustusan"],
    "Batuan": ["Aloja", "Behind The Clouds", "Cabacnitan", "Cambacay", "Cantigdas", "Garcia", "Janlud", "Poblacion Norte", "Poblacion Sur", "Poblacion Vieja", "Quezon", "Quirino", "Rizal", "Rosariohan", "Santa Cruz"],
    "Bien Unido": ["Bilangbilangan Dako", "Bilangbilangan Diot", "Hingotanan East", "Hingotanan West", "Liberty", "Malingin", "Mandawa", "Maomawan", "Nueva Esperanza", "Nueva Estrella", "Pinamgo", "Poblacion", "Puerto San Pedro", "Sagasa", "Tuboran"],
    "Bilar": ["Bonifacio", "Bugang Norte", "Bugang Sur", "Cabacnitan", "Cambigsi", "Campagao", "Cansumbol", "Dagohoy", "Owac", "Poblacion", "Quezon", "Riverside", "Rizal", "Roxas", "Subayon", "Villa Aurora", "Villa Suerte", "Yanaya", "Zamora"],
    "Buenavista": ["Anonang", "Asinan", "Bago", "Baluarte", "Bantuan", "Bato", "Bonotbonot", "Bugaong", "Cambuhat", "Cambus-Oc", "Cangawa", "Cantomugcad", "Cantores", "Cantuba", "Catigbian", "Cawag", "Cruz", "Dait", "Eastern Cabul-an", "Hunan", "Lapacan Norte", "Lapacan Sur", "Lubang", "Lusong", "Magkaya", "Merryland", "Nueva Granada", "Nueva Montana", "Overland", "Panghagban", "Poblacion", "Puting Bato", "Rufo Hill", "Sweetland", "Western Cabul-an"],
    "Calape": ["Abucayan Norte", "Abucayan Sur", "Banlasan", "Bentig", "Binogawan", "Bonbon", "Cabayugan", "Cabudburan", "Calunasan", "Camias", "Canguha", "Catmonan", "Desamparados", "Kahayag", "Kinabag-An", "Labuon", "Lawis", "Liboron", "Lo-Oc", "Lomboy", "Lucob", "Madangog", "Magtongtong", "Mandaug", "Mantatao", "Sampoangon", "San Isidro", "Santa Cruz", "Sojoton", "Talisay", "Tinibgan", "Tultugan", "Ulbujan"],
    "Candijay": ["Abihilan", "Anoling", "Boyo-An", "Cadapdapan", "Cambane", "Can-Olin", "Canawa", "Cogtong", "La Union", "Luan", "Lungsoda-An", "Mahangin", "Pagahat", "Panadtaran", "Panas", "Poblacion", "San Isidro", "Tambongan", "Tawid", "Tubod", "Tugas"],
    "Carmen": ["Alegria", "Bicao", "Buenavista", "Buenos Aires", "Calatrava", "El Progreso", "El Salvador", "Guadalupe", "Katipunan", "La Libertad", "La Paz", "La Salvacion", "La Victoria", "Matin-Ao", "Montehermoso", "Montesuerte", "Montesunting", "Montevideo", "Nueva Fuerza", "Nueva Vida Este", "Nueva Vida Norte", "Nueva Vida Sur", "Poblacion Norte", "Poblacion Sur", "Tambo-An", "Vallehermoso", "Villaflor", "Villafuerte", "Villarcayo"],
    "Catigbian": ["Alegria", "Ambuan", "Baang", "Bagtic", "Bongbong", "Cambailan", "Candumayao", "Causwagan Norte", "Hagbuaya", "Haguilanan", "Kang-Iras", "Libertad Sur", "Liboron", "Mahayag Norte", "Mahayag Sur", "Maitum", "Mantasida", "Poblacion", "Poblacion Weste", "Rizal", "Sinakayanan", "Triple Union"],
    "Clarin": ["Bacani", "Bogtongbod", "Bonbon", "Bontud", "Buacao", "Buangan", "Cabog", "Caboy", "Caluwasan", "Candajec", "Cantoyoc", "Comaang", "Danahao", "Katipunan", "Lajog", "Mataub", "Nahawan", "Poblacion Centro", "Poblacion Norte", "Poblacion Sur", "Tangaran", "Tontunan", "Tubod", "Villaflor"],
    "Corella": ["Anislag", "Canangca-An", "Canapnapan", "Cancatac", "Pandol", "Poblacion", "Sambog", "Tanday"],
    "Cortes": ["De La Paz", "Fatima", "Loreto", "Lourdes", "Malayo Norte", "Malayo Sur", "Monserrat", "New Lourdes", "Patrocinio", "Poblacion", "Rosario", "Salvador", "San Roque", "Upperdela Paz"],
    "Dagohoy": ["Babag", "Cagawasan", "Cagawitan", "Caluasan", "Can-Oling", "Candelaria", "Estaca", "La Esperanza", "Mahayag", "Malitbog", "Poblacion", "San Miguel", "San Vicente", "Santa Cruz", "Villa Aurora"],
    "Danao": ["Cabatuan", "Cantubod", "Carbon", "Concepcion", "Dagohoy", "Hibale", "Magtangtang", "Nahud", "Poblacion", "Remedios", "San Carlos", "San Miguel", "Santa Fe", "Santo Niño", "Tabok", "Taming", "Villa Anunciado"],
    "Dauis": ["Biking", "Bingag", "Catarman", "Dao", "Mariveles", "Mayacabac", "Poblacion", "San Isidro", "Songculan", "Tabalong", "Tinago", "Totolan"],
    "Dimiao": ["Abihid", "Alemania", "Baguhan", "Bakilid", "Balbalan", "Banban", "Bauhugan", "Bilisan", "Cabagakian", "Cabanbanan", "Cadap-Agan", "Cambacol", "Cambayaon", "Canhayupon", "Canlambong", "Casingan", "Catugasan", "Datag", "Guindaguitan", "Guingoyuran", "Ile", "Lapsaon", "Limokon Ilaod", "Limokon Ilaya", "Luyo", "Malijao", "Oac", "Pagsa", "Pangihawan", "Puangyuta", "Sawang", "Tangohay", "Taongon Cabatuan", "Taongon Can-Andam", "Tawid Bitaog"],
    "Duero": ["Alejawan", "Angilan", "Anibongan", "Bangwalog", "Cansuhay", "Danao", "Duay", "Guinsularan", "Imelda", "Itum", "Langkis", "Lobogon", "Madua Norte", "Madua Sur", "Mambool", "Mawi", "Payao", "San Antonio", "San Isidro", "San Pedro", "Taytay"],
    "Garcia Hernandez": ["Abijilan", "Antipolo", "Basiao", "Cagwang", "Calma", "Cambuyo", "Canayaon East", "Canayaon West", "Candanas", "Candulao", "Catmon", "Cayam", "Cupa", "Datag", "Estaca", "Libertad", "Lungsodaan East", "Lungsodaan West", "Malinao", "Manaba", "Pasong", "Poblacion East", "Poblacion West", "Sacaon", "Sampong", "Tabuan", "Togbongon", "Ulbujan East", "Ulbujan West", "Victoria"],
    "Guindulman": ["Basdio", "Bato", "Bayong", "Biabas", "Bulawan", "Cabantian", "Canhaway", "Cansiwang", "Casbu", "Catungawan Norte", "Catungawan Sur", "Guinacot", "Guio-Ang", "Lombog", "Mayuga", "Sawang", "Tabajan", "Tabunok", "Trinidad"],
    "Inabanga": ["Anonang", "Badiang", "Baguhan", "Bahan", "Banahao", "Baogo", "Bugang", "Cagawasan", "Cagayan", "Cambitoon", "Canlinte", "Cawayan", "Cogon", "Cuaming", "Dagnawan", "Dagohoy", "Dait Sur", "Datag", "Fatima", "Hambongan", "Ilaud", "Ilaya", "Ilihan", "Lapacan Norte", "Lapacan Sur", "Lawis", "Liloan Norte", "Liloan Sur", "Lomboy", "Lonoy Cainsican", "Lonoy Roma", "Lutao", "Luyo", "Mabuhay", "Maria Rosario", "Nabuad", "Napo", "Ondol", "Poblacion", "Riverside", "Saa", "San Isidro", "San Jose", "Santo Niño", "Santo Rosario", "Sua", "Tambook", "Tungod", "U-Og", "Ubujan"],
    "Jagna": ["Alejawan", "Balili", "Boctol", "Bunga Ilaya", "Bunga Mar", "Buyog", "Cabunga-An", "Calabacita", "Cambugason", "Can-Ipol", "Can-Uba", "Can-Upao", "Canjulao", "Cantagay", "Cantuyoc", "Faraon", "Ipil", "Kinagbaan", "Laca", "Larapan", "Lonoy", "Looc", "Malbog", "Mayana", "Naatang", "Nausok", "Odiong", "Pagina", "Pangdan", "Poblacion", "Tejero", "Tubod Mar", "Tubod Monte"],
    "Jetafe": ["Alumar", "Banacon", "Buyog", "Cabasakan", "Campao Occidental", "Campao Oriental", "Cangmundo", "Carlos P.Garcia", "Corte Baud", "Handumon", "Jagoliao", "Jandayan Norte", "Jandayan Sur", "Mahanay", "Nasingin", "Pandanon", "Poblacion", "Saguise", "Salog", "San Jose", "Santo Niño", "Taytay", "Tugas", "Tulang"],
    "Lila": ["Banban", "Bonkokan Ilaya", "Bonkokan Ubos", "Calvario", "Candulang", "Catugasan", "Cayupo", "Cogon", "Jambawan", "La Fortuna", "Lomanoy", "Macalingan", "Malinao East", "Malinao West", "Nagsulay", "Poblacion", "Taug", "Tiguis"],
    "Loay": ["Agape", "Alegria Norte", "Alegria Sur", "Bonbon", "Botoc Occidental", "Botoc Oriental", "Calvario", "Concepcion", "Hinawanan", "Las Salinas Norte", "Las Salinas Sur", "Palo", "Poblacion Ibabao", "Poblacion Ubos", "Sagnap", "Tambangan", "Tangcasan Norte", "Tangcasan Sur", "Tayong Occidental", "Tayong Oriental", "Tocdog Dacu", "Tocdog Ilaya", "Villalimpia", "Yanangan"],
    "Loboc": ["Agape", "Alegria", "Bagumbayan", "Bahian", "Bonbon Lower", "Bonbon Upper", "Buenavista", "Bugho", "Cabadiangan", "Calunasan Norte", "Calunasan Sur", "Camayaan", "Cambance", "Candabong", "Candasag", "Canlasid", "Gon-Ob", "Gotozon", "Jimilian", "Oy", "Poblacion Ondol", "Poblacion Sawang", "Quinoguitan", "Taytay", "Tigbao", "Ugpong", "Valladolid", "Villaflor"],
    "Loon": ["Agsoso", "Badbad Occidental", "Badbad Oriental", "Bagacay Katipunan", "Bagacay Kawayan", "Bagacay Saong", "Bahi", "Basac", "Basdacu", "Basdio", "Biasong", "Bongco", "Bugho", "Cabacongan", "Cabadug", "Cabug", "Calayugan Norte", "Calayugan Sur", "Cambaquiz", "Campatud", "Candaigan", "Canhangdon Occidental", "Canhangdon Oriental", "Canigaan", "Canmaag", "Canmanoc", "Cansuagwit", "Cansubayon", "Cantam-Is Bago", "Cantam-Is Baslay", "Cantaongon", "Cantumocad", "Catagbacan Handig", "Catagbacan Norte", "Catagbacan Sur", "Cogon Norte", "Cogon Sur", "Cuasi", "Genomoan", "Lintuan", "Looc", "Mocpoc Norte", "Mocpoc Sur", "Moto Norte", "Moto Sur", "Nagtuang", "Napo", "Nueva Vida", "Panangquilon", "Pantudlan", "Pig-Ot", "Pondol", "Quinobcoban", "Sondol", "Song-On", "Talisay", "Tan-Awan", "Tangnan", "Taytay", "Ticugan", "Tiwi", "Tontonan", "Tubodacu", "Tubodio", "Tubuan", "Ubayon", "Ubojan", "Villanueva"],
    "Mabini": ["Abaca", "Abad Santos", "Aguipo", "Baybayon", "Bulawan", "Cabidian", "Cawayanan", "Concepcion", "Del Mar", "Lungsoda-An", "Marcelo", "Minol", "Paraiso", "Poblacion I", "Poblacion II", "San Isidro", "San Jose", "San Rafael", "San Roque", "Tambo", "Tangkigan", "Valaga"],
    "Maribojoc": ["Agahay", "Aliguay", "Anislag", "Bayacabac", "Bood", "Busao", "Cabawan", "Candavid", "Dipatlong", "Guiwanon", "Jandig", "Lagtangon", "Lincod", "Pagnitoan", "Poblacion", "Punsod", "Punta Cruz", "San Isidro", "San Roque", "San Vicente", "Tinibgan", "Toril"],
    "Panglao": ["Bil-Isan", "Bolod", "Danao", "Doljo", "Libaong", "Looc", "Lourdes", "Poblacion", "Tangnan", "Tawala"],
    "Pilar": ["Aurora", "Bagacay", "Bagumbayan", "Bayong", "Buenasuerte", "Cagawasan", "Cansungay", "Catagda-An", "Del Pilar", "Estaca", "Ilaud", "Inaghuban", "La Suerte", "Lumbay", "Lundag", "Pamacsalan", "Poblacion", "Rizal", "San Carlos", "San Isidro", "San Vicente"],
    "Pres. Carlos P. Garcia": ["Aguining", "Basiao", "Baud", "Bayog", "Bogo", "Bonbonon", "Butan", "Campamanog", "Canmangao", "Gaus", "Kabangkalan", "Lapinig", "Lipata", "Poblacion", "Popoo", "Saguise", "San Jose", "San Vicente", "Santo Rosario", "Tilmobo", "Tugas", "Tugnao", "Villa Milagrosa"],
    "Sagbayan": ["Calangahan", "Canmano", "Canmaya Centro", "Canmaya Diot", "Dagnawan", "Kabasacan", "Kagawasan", "Katipunan", "Langtad", "Libertad Norte", "Libertad Sur", "Mantalongon", "Poblacion", "Sagbayan Sur", "San Agustin", "San Antonio", "San Isidro", "San Ramon", "San Roque", "San Vicente Norte", "San Vicente Sur", "Santa Catalina", "Santa Cruz", "Ubojan"],
    "San Isidro": ["Abehilan", "Baryong Daan", "Baunos", "Cabanugan", "Caimbang", "Cambansag", "Candungao", "Cansague Norte", "Cansague Sur", "Causwagan Sur", "Masonoy", "Poblacion"],
    "San Miguel": ["Bayongan", "Bugang", "Cabangahan", "Caluasan", "Camanaga", "Cambangay Norte", "Capayas", "Corazon", "Garcia", "Hagbuyo", "Kagawasan", "Mahayag", "Poblacion", "San Isidro", "San Jose", "San Vicente", "Santo Niño", "Tomoc"],
    "Sevilla": ["Bayawahan", "Cabancalan", "Calinga-An", "Calinginan Norte", "Calinginan Sur", "Cambagui", "Ewon", "Guinob-An", "Lagtangan", "Licolico", "Lobgob", "Magsaysay", "Poblacion"],
    "Sierra Bullones": ["Abachanan", "Anibongan", "Bugsoc", "Cahayag", "Canlangit", "Canta-Ub", "Casilay", "Danicop", "Dusita", "La Union", "Lataban", "Magsaysay", "Man-Od", "Matin-Ao", "Poblacion", "Salvador", "San Agustin", "San Isidro", "San Jose", "San Juan", "Santa Cruz", "Villa Garcia"],
    "Sikatuna": ["Abucay Norte", "Abucay Sur", "Badiang", "Bahaybahay", "Cambuac Norte", "Cambuac Sur", "Canagong", "Libjo", "Poblacion I", "Poblacion II"],
    "Tagbilaran City": ["Bool", "Booy", "Cabawan", "Cogon", "Dampas", "Dao", "Manga", "Mansasa", "Poblacion I", "Poblacion II", "Poblacion III", "San Isidro", "Taloto", "Tiptip", "Ubujan"],
    "Talibon": ["Bagacay", "Balintawak", "Burgos", "Busalian", "Calituban", "Cataban", "Guindacpan", "Magsaysay", "Mahanay", "Nocnocan", "Poblacion", "Rizal", "Sag", "San Agustin", "San Carlos", "San Francisco", "San Isidro", "San Jose", "San Pedro", "San Roque", "Santo Niño", "Sikatuna", "Suba", "Tanghaligue", "Zamora"],
    "Trinidad": ["Banlasan", "Bongbong", "Catoogan", "Guinobatan", "Hinlayagan Ilaud", "Hinlayagan Ilaya", "Kauswagan", "Kinan-Oan", "La Union", "La Victoria", "Mabuhay Cabigohan", "Mahagbu", "Manuel M.Roxas", "Poblacion", "San Isidro", "San Vicente", "Santo Tomas", "Soom", "Tagum Norte", "Tagum Sur"],
    "Tubigon": ["Bagongbanwa", "Banlasan", "Batasan", "Bilangbilangan", "Bosongon", "Buenos Aires", "Bunacan", "Cabulihan", "Cahayag", "Cawayanan", "Centro", "Genonocan", "Guiwanon", "Ilihan Norte", "Ilihan Sur", "Libertad", "Macaas", "Matabao", "Mocaboc Island", "Panangquilon", "Pandan", "Pangapasan", "Pinayagan Norte", "Pinayagan Sur", "Pooc Occidental", "Pooc Oriental", "Potohan", "Talenceras", "Tan-Awan", "Tinangnan", "Ubay Island", "Ubojan", "Villanueva"],
    "Ubay": ["Achila", "Bay-Ang", "Benliw", "Biabas", "Bongbong", "Bood", "Buenavista", "Bulilis", "Cagting", "Calanggaman", "California", "Camali-An", "Camambugan", "Casate", "Cuya", "Fatima", "Gabi", "Governor Boyles", "Guintabo-An", "Hambabauran", "Humayhumay", "Ilihan", "Imelda", "Juagdan", "Katarungan", "Lomangog", "Los Angeles", "Pag-Asa", "Pangpang", "Poblacion", "San Francisco", "San Isidro", "San Pascual", "San Vicente", "Sentinila", "Sinandigan", "Tapal", "Tapon", "Tintinan", "Tipolo", "Tubog", "Tuboran", "Union", "Villa Teresita"],
    "Valencia": ["Adlawan", "Anas", "Anonang", "Anoyon", "Balingasao", "Banderahan", "Botong", "Buyog", "Canduao Occidental", "Canduao Oriental", "Canlusong", "Canmanico", "Cansibao", "Catug-A", "Cutcutan", "Danao", "Genoveva", "Ginopolan", "La Victoria", "Lantang", "Limocon", "Loctob", "Magsaysay", "Marawis", "Maubo", "Nailo", "Omjon", "Pangi-An", "Poblacion Occidental", "Poblacion Oriental", "Simang", "Taug", "Tausion", "Taytay", "Ticum"]
};

export function populateBarangays() {
    const city          = document.getElementById('fCity').value;
    const barangaySelect = document.getElementById('fBarangay');

    if (!city || !boholBarangays[city]) {
        barangaySelect.innerHTML = '<option value="">— Select City first —</option>';
        barangaySelect.disabled  = true;
        return;
    }

    const barangays = boholBarangays[city].slice().sort();
    barangaySelect.innerHTML = '<option value="">— Select Barangay —</option>' +
        barangays.map(b => `<option value="${b}">${b}</option>`).join('');
    barangaySelect.disabled = false;
}

export function updateRadiusControl() {
    const type         = document.getElementById('fType').value;
    const radiusControl = document.getElementById('radius-control');
    const fireNotice    = document.getElementById('fire-notice');
    const floodNotice   = document.getElementById('flood-notice');
    if (!radiusControl || !fireNotice || !floodNotice) return;

    radiusControl.style.display = 'none';
    fireNotice.style.display    = 'none';
    floodNotice.style.display   = 'none';
    clearRadiusCircle();

    if (type === 'Earthquake' || type === 'Other') {
        radiusControl.style.display = 'block';
        if (reportPin) drawRadiusCircle(parseFloat(document.getElementById('fRadius').value) || 1);
    } else if (type === 'Fire') {
        fireNotice.style.display = 'block';
        if (reportPin) drawRadiusCircle(0.5);
    } else if (type === 'Flood') {
        floodNotice.style.display = 'block';
    }
}

export function updateRadiusDisplay(val) {
    const display = document.getElementById('radius-display');
    if (display) display.textContent = val + ' km';
}

export function setupFullReportForm(onSuccess) {
    const form = document.getElementById('fullReportForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title       = document.getElementById('fTitle').value.trim();
        const hazardType  = document.getElementById('fType').value;
        const severity    = document.getElementById('fSeverity').value;
        const description = document.getElementById('fDesc').value.trim();   // now required
        const incidentDate = document.getElementById('fDate').value;
        const barangay    = document.getElementById('fBarangay').value;
        const city        = document.getElementById('fCity').value;
        const lat         = parseFloat(document.getElementById('fLat').value);
        const lng         = parseFloat(document.getElementById('fLng').value);

        // Validate all required fields including description
        if (!title || !hazardType || !severity || !description || !incidentDate || !barangay || !city) {
            window.alert('Please complete all required fields, including the Situation Assessment.');
            return;
        }

        if (hazardType !== 'Flood' && (!lat || !lng)) {
            window.alert('Please drop a pin on the map to mark the hazard location.');
            return;
        }

        const radiusValue = hazardType === 'Fire' ? 0.5 :
                            hazardType === 'Flood' ? null :
                            parseFloat(document.getElementById('fRadius').value) || 1;

        const payload = {
            title,
            type:        hazardType,
            severity,
            description,
            incidentDate,
            location: {
                address: `${barangay}, ${city}, Bohol`,
                lat:     lat || null,
                lng:     lng || null
            },
            radius:    radiusValue,
            timestamp: new Date().toISOString()
        };

        try {
            // Use authFetch so the server can verify the user
            const res = await window.authFetch('/api/report-hazard', {
                method: 'POST',
                body:   JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json();
                window.alert('Error submitting report: ' + err.message);
                return;
            }

            form.reset();
            await onSuccess();
        } catch {
            window.alert('Server connection failed. Please try again.');
        }
    });
}