// Initialisation des variables
var recordId = -1;                // stocke l'id de l'enregistrement en cours
var recordRef = '';               // référence (n° de cas) de l'enregistrement en cours
var recordUUID = 'test';          // identifiant unique de l'enregistrement nouvellement créé
var newRecord = false;            // indicateur de la création d'un nouvel enregistrement
var updateNewRec = false;         // indicateur de la mise à jour d'un nouvel enregistrement
var updateRec = false;            // indicateur de la mise à jour d'un enregistrement modifié
var lastUpdate = '';              // stocke la date de dernière mise à jour de l'enregistrement en cours
var validateMsg = [];             // stocke les messages d'erreur de validation du formulaire

// URL du logo du ministère en charge de l'agriculture (image utilisée dans le document PDF)
const logo_agriculture = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Minist%C3%A8re_de_l%E2%80%99Agriculture_et_de_la_Souverainet%C3%A9_alimentaire.svg/640px-Minist%C3%A8re_de_l%E2%80%99Agriculture_et_de_la_Souverainet%C3%A9_alimentaire.svg.png'

// Gestion du mode de vue du widget (Menu ou Formulaire édition/création)
const vMenu = 0;  // - Mode 'menu'
const vEdit = 1;  // - Mode 'formulaire en édition'
const vNew = 2;   // - Mode 'formulaire en création'
var viewMode = vMenu;   // stocke le mode de vue actuel
var viewChange = '';    // stocke le mode de vue souhaité

// Références à la table liée au widget
const workTable = 'Declaration';  // référence de la table de travail
const columnUUID = 'Adresse';     // référence de la colonne de la table de travail stockant l'id unique de l'enregistrement en création (colonne de type texte)

// Stockage des listes de référence (sérotypes, groupes d'espèces, espèces)
const refSerotype = 'refSerotype';
const refSpeciesGroup = 'refSpeciesGroup';
const refSpecies = 'refSpecies';
var refList = new Map();

// Mappage des champs du formulaire et des colonnes de la table de travail
// Pour chaque champs du formulaire, un objet définissant le paramétrage de la colonne dans la table de travail :
//    - access = accés permis pour la colonne (RO = Read Only / RW = Read Write)
//    - name = nom de la colonne
//    - type = type de donnée pour la colonne
var formField = new Map([
  ['caseNumber', {'access':'RO', 'name':'N_du_cas2', 'type':'text'}],
  ['serotype', {'access':'RW', 'name':'Type_agent_pathogene', 'type':'int', 'liste':refSerotype}],
  ['caseType', {'access':'RW', 'name':'Type_de_cas', 'type':'text'}],
  ['suspicionDate', {'access':'RW', 'name':'Date_de_suspicion', 'type':'date'}],
  ['confirmationDate', {'access':'RW', 'name':'Date_de_confirmation', 'type':'date'}],
  ['infirmationDate', {'access':'RW', 'name':'Date_d_infirmation', 'type':'date'}],
  ['speciesGroup', {'access':'RW', 'name':'Groupe_espece', 'type':'int', 'liste':refSpeciesGroup}],
  ['species', {'access':'RW', 'name':'Ref_Espece', 'type':'int', 'liste':refSpecies}],
  ['farmingType', {'access':'RW', 'name':'Type_d_elevage', 'type':'text'}],
  ['edeNumber', {'access':'RW', 'name':'N_EDE', 'type':'text'}],
  ['siretNumber', {'access':'RW', 'name':'SIRET', 'type':'text'}],
  ['nagritNumber', {'access':'RW', 'name':'NUMAGRIT', 'type':'text'}],
  ['establishmentName', {'access':'RW', 'name':'Etablissement', 'type':'text'}],
  ['address', {'access':'RW', 'name':'Adresse', 'type':'text'}],
  ['postalCode', {'access':'RW', 'name':'Code_postal', 'type':'text'}],
  ['city', {'access':'RW', 'name':'Commune', 'type':'text'}],
  ['department', {'access':'RW', 'name':'Departement', 'type':'text'}],
  ['longitude', {'access':'RW', 'name':'Longitude', 'type':'float'}],
  ['latitude', {'access':'RW', 'name':'Latitude', 'type':'float'}],
  ['createdDate', {'access':'RO', 'name':'Cree_Le', 'type':'text'}],
  ['createdUser', {'access':'RO', 'name':'Cree_Par', 'type':'text'}],
  ['updatedDate', {'access':'RO', 'name':'Modifie_Le', 'type':'text'}],
  ['updatedUser', {'access':'RO', 'name':'Modifie_Par', 'type':'text'}]
]);

// Paramétrage de l'impression PDF du formulaire
// Chaque ligne peut intégrer les paramètres suivants :
//    - Nom du champ ou #LFn (#LF = line feed et n = identifiant unique parmis les #LF)
//    - print = formatage du texte à insérer (#L = texte du label, #V = texte de la valeur)
//    - required = insérer le texte même si la valeur du champ est vide
//    - align = aligement par rapport à la position du curseur
//    - xPos = force la position horizontale du curseur selon une grille (C2 = milieu de page, C3 et C6 = tiers de page)
//    - linefeed = nombre de ligne à sauter suite à l'insertion du texte
//    - indent = retrait sur la position horizontale pour le prochain texte inséré
//    - liste = liste de référence à utiliser pour déterminer le texte correspondant à la valeur du champ
//    - fontsize = taille de la police
var printParam = new Map([
  ['#LF0', {'print':'Récapitulatif d\'une déclaration de cas', 'align':'center', 'xPos':'C2', 'linefeed':1, 'fontsize':14}],
  ['serotype', {'print':'FCO #L #V', 'required':true, 'align':'center', 'xPos':'C2', 'linefeed':1, 'liste':refSerotype}],
  ['caseNumber', {'print':'#L: #V', 'required':true, 'align':'center', 'xPos':'C2', 'linefeed':0}],
  ['#LF1', {'linefeed':2, 'fontsize':11}],
  ['caseType', {'print':'#L: #V', 'required':true, 'align':'left', 'xPos':'C0', 'linefeed':0}],
  ['suspicionDate', {'print':'#L: #V', 'required':true, 'align':'left', 'xPos':'C3', 'linefeed':0}],
  ['confirmationDate', {'print':'#L: #V', 'align':'left', 'xPos':'C6', 'linefeed':0}],
  ['infirmationDate', {'print':'#L: #V', 'align':'left', 'xPos':'C6', 'linefeed':0}],
  ['#LF2', {'linefeed':2}],
  ['speciesGroup', {'print':'#L: #V', 'required':true, 'align':'left', 'xPos':'C0', 'linefeed':0, 'liste':refSpeciesGroup}],
  ['species', {'print':'#L: #V', 'required':true, 'align':'left', 'xPos':'C3', 'linefeed':2, 'liste':refSpecies}],
  ['siretNumber', {'print':'#L: #V', 'align':'left', 'xPos':'C0', 'linefeed':0}],
  ['nagritNumber', {'print':'#L: #V', 'align':'left', 'xPos':'C0', 'linefeed':0}],
  ['edeNumber', {'print':'#L: #V', 'required':true, 'align':'left', 'xPos':'C3', 'linefeed':0}],
  ['farmingType', {'print':'#L: #V', 'required':true, 'align':'left', 'xPos':'C6', 'linefeed':1}],
  ['#LF5', {'linefeed':1}],
  ['establishmentName', {'print':'#L: #V', 'required':true, 'align':'left', 'xPos':'C0', 'linefeed':1}],
  ['address', {'print':'#L: #V', 'required':true, 'align':'left', 'xPos':'C0', 'linefeed':1, 'indent':'#L: '}],
  ['postalCode', {'print':'#V', 'required':true, 'align':'left', 'linefeed':0}],
  ['city', {'print':'#V', 'required':true, 'align':'left', 'linefeed':0}],
  ['department', {'print':'(#V)', 'required':true, 'align':'left', 'linefeed':2}],
  ['longitude', {'print':'#L: #V', 'required':true, 'align':'left', 'xPos':'C0', 'linefeed':1}],
  ['latitude', {'print':'#L: #V', 'required':true, 'align':'left', 'xPos':'C0', 'linefeed':1}]
]);

// point repérant le centre de la France
const centreFrance = L.latLng(46.232193,2.209667);

// initialisation de la variable map stockant la carte Leaflet 
var map = L.map("viewerDiv").setView(centreFrance,5);
L.tileLayer(
  'https://data.geopf.fr/wmts?service=WMTS&request=GetTile&version=1.0.0&tilematrixset=PM&tilematrix={z}&tilecol={x}&tilerow={y}&layer=ORTHOIMAGERY.ORTHOPHOTOS&format=image/jpeg&style=normal',
  {
      minZoom : 5,
      maxZoom : 19,
      tileSize : 256,
      attribution : "IGN-F/Géoportail"
  }).addTo(map);

// initialisation de la variable stockant le pointeur sur la carte
var marker = new L.marker(
  centreFrance,                     // localiser au centre de la France
  {opacity: 0, draggable: false}    // invisible et non déplaçable
).addTo(map);

// fonction initialisant l'affichage de la carte
// cas d'usage : initialisation du formulaire en mode création
function initMarker() {
  marker.setLatLng(centreFrance);
  map.setView(centreFrance, 5);
  marker.setOpacity(0);
  marker.dragging.disable();
}

// fonction positionnant le curseur sur la carte
// cas d'usage : modification de la latitude et la longitude d'un enregistrement
function setMarker() {  
    const longitude = document.getElementById('longitude');
    const latitude =  document.getElementById('latitude');          
    if (longitude.value !=0 && latitude.value != 0) {
      marker.setLatLng([latitude.value,longitude.value]);
      map.setView([latitude.value,longitude.value], 18);
      marker.setOpacity(1);
      marker.dragging.enable();
    }
};

// fonction gérant l'évènement déplacement du pointeur sur la carte
function dragMarker(e) {
    const longitude = document.getElementById('longitude');
    const latitude =  document.getElementById('latitude');  
    let position = e.target.getLatLng();

    setElementValue(longitude, parseFloat(position.lng.toFixed(5)));
    setElementValue(latitude, parseFloat(position.lat.toFixed(5)));
}

function updateserotypeOptions() {
  const serotype = document.getElementById('serotype');
  serotype.innerHTML = '<option value="" disabled selected>&#9888 Sélectionnez...</option>';
  
  // pour chaque sérotype présent dans la liste de référence 'refSerotype'
  refList.get(refSerotype).forEach((value, key) => {
    // ajouter une option à la liste de sélection du formulaire
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = value;
    serotype.appendChild(opt);
  });
}

async function getSerotype() {
  const tableName = 'Type_Agent_Pathogene_FCO'
  const colName = 'Serotype'
  const records = await grist.docApi.fetchTable(tableName);

  // créer une liste de référence 'refSerotype'
  refList.set(refSerotype, new Map());
  // pour chaque sérotype de la table de référence
  for (let i = 0; i < records[colName].length; i++) {
    // mapper le sérotype dans cette liste de référence
    refList.get(refSerotype).set(records['id'][i], records[colName][i]);
  }
  // Mettre à jour la liste de sélection du formulaire
  updateserotypeOptions();
}

function updateSpeciesGroupOptions() {
  const speciesGroup = document.getElementById('speciesGroup');
  speciesGroup.innerHTML = '<option value="" disabled selected>&#9888 Sélectionnez...</option>';
  
  // pour chaque groupe d'espèce présent dans la liste de référence 'refSpeciesGroup'
  refList.get(refSpeciesGroup).forEach((value, key) => {
    // ajouter une option à la liste de sélection du formulaire
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = value;
    speciesGroup.appendChild(opt);
  });
  // ajouter un évènement 'change' à cette liste de sélection pour mettre à jour la liste des espèces
  speciesGroup.addEventListener('change', updateSpeciesOptions);
}

async function getSpeciesGroup() {
  const tableName = 'Groupe_espece'
  const colName = 'Groupe_espece'
  const records = await grist.docApi.fetchTable(tableName);

  // créer une liste de référence 'refSpeciesGroup'
  refList.set(refSpeciesGroup, new Map());
  // pour chaque groupe d'espèce de la table de référence
  for (let i = 0; i < records[colName].length; i++) {
    group = {name:records[colName][i], species: new Map()};
    // mapper le groupe d'espèce dans cette liste de référence
    refList.get(refSpeciesGroup).set(records['id'][i], records[colName][i]);
    // créer une liste de référence pour mapper les espèces de ce groupe d'espèce
    refList.set(records[colName][i], new Map());
  }
  // Mettre à jour la liste de sélection du formulaire
  updateSpeciesGroupOptions();
}

function updateSpeciesOptions() {
    // Si un groupe d'espèce a été sélectionné dans le formulaire
    const speciesGroup_Key = document.getElementById('speciesGroup').value;
    if (speciesGroup_Key) {

      // activer la liste de sélection des espèces du formulaire
      const species = document.getElementById('species');
      species.disabled = false;
      species.setAttribute('required','');
      species.innerHTML = '<option value="" disabled selected>&#9888 Sélectionnez...</option>';

      // récupérer le nom du groupe d'espèce sélectionné dans le formulaire
      const speciesGroup_Value = refList.get(refSpeciesGroup).get(parseInt(speciesGroup_Key));
      
      // charger la liste avec les espèces définies pour ce groupe d'espèce
      refList.get(speciesGroup_Value).forEach((value, key) => {
          const opt = document.createElement('option');
          opt.value = key;
          opt.textContent = value;
          species.appendChild(opt);
      });

    }
}

async function getSpecies() {
    const tableName = 'Espece'
    const speciesName = 'Name'
    const groupName = 'Groupe_espece'
    const records = await grist.docApi.fetchTable(tableName);

    // créer une liste de référence 'refSpecies'
    refList.set(refSpecies, new Map());
    // pour chaque espèce de la table de référence
    for (let i = 0; i < records[speciesName].length; i++) {
      // mapper cette espèce dans cette liste de référence
      refList.get(refSpecies).set(records['id'][i], records[speciesName][i]);
      // mapper cette espèce dans la liste de référence du groupe d'espèce à laquelle elle appartient
      const aGroup = refList.get(refSpeciesGroup).get(records[groupName][i]);
      refList.get(aGroup).set(records['id'][i], records[speciesName][i]);
    }

}

function setElementValue(element, value) {
  element.value = value;
  element.classList.remove('warning');
}

function getDepartement(inseeCode) {
  const geoapi = 'https://geo.api.gouv.fr/departements?code=';
  fetch(geoapi+inseeCode)
    .then(response => {
      if (!response.ok) {
        throw new Error(`API Geo - erreur HTTP : ${response.status}`);
      }
      var rep = response.json();
      return rep;
    })
    .then(data => {
        if (Object.keys(data).length = 1) {
          const departement = document.getElementById('department');
          setElementValue(departement, data[0].nom);
          // departement.value = data[0].nom;
        }
    })
    .catch(error => {
      console.log(`API Geo - Erreur : ${error.message}`);
    }); 
}

function getCommune(inseeCode) {
  const geoapi = 'https://geo.api.gouv.fr/communes?format=geojson&geometry=centre&code=';
  fetch(geoapi+inseeCode)
    .then(response => {
      if (!response.ok) {
        throw new Error(`API Geo - erreur HTTP : ${response.status}`);
      }
      var rep = response.json();
      return rep;
    })
    .then(data => {
        if (Object.keys(data.features).length = 1) {
          
          commune = data.features[0];
          
          const ville = document.getElementById('city');
          setElementValue(ville, commune.properties.nom);
          // ville.value = commune.properties.nom;
          
          getDepartement(commune.properties.codeDepartement);

          const longitude = document.getElementById('longitude');
          const latitude =  document.getElementById('latitude');          
          if (!longitude.value || !latitude.value ) {
            setElementValue(longitude, parseFloat(commune.geometry.coordinates[0].toFixed(5)));
            setElementValue(latitude,parseFloat(commune.geometry.coordinates[1].toFixed(5)));
            // longitude.value = commune.geometry.coordinates[0];
            // latitude.value = commune.geometry.coordinates[1];
            setMarker();
          }
          
          const ede = document.getElementById('edeNumber');
          if (ede.value == '' || ede.value.length != 8) {
            // ede.value = commune.properties.code;
            setElementValue(ede, commune.properties.code);
          }
  
        }
    })
    .catch(error => {
      console.log(`API Geo - Erreur : ${error.message}`);
    });
}

function updateSelection(adresses) {
    var ul = document.createElement('ul');
    
    adresses.forEach(function (adresse) {
        var li = document.createElement('li');
        var infosAdresse = document.createTextNode(adresse.properties.name + ', ' + adresse.properties.postcode + ' ' + adresse.properties.city);
        li.onclick = function () { selectAddress(adresse); };
        li.appendChild(infosAdresse);
        ul.appendChild(li);
    });
    return ul
};

function getAucompletion() {
    const select = document.getElementById("selection");
    const apiAdresse = 'https://api-adresse.data.gouv.fr/search';
    const adresse = document.getElementById("address").value;

    if (adresse) {
      const request = apiAdresse + '/?q=' + adresse + '?type=housenumber&autocomplete=1&limit=5';
      fetch(request)
        .then(response => {
          if (!response.ok) {
            throw new Error(`API Adresse - erreur HTTP : ${response.status}`);
          }
          var rep = response.json();
          return rep;
        })
        .then(data => {
          if (Object.keys(data.features).length > 0) {

            select.style.display = "block";
            if (select.firstChild) {
              select.removeChild(select.firstChild);
            }
            const adresses = data.features; 
            select.appendChild(updateSelection(adresses));
          } else {
            select.style.display = "none";
          }
        })
        .catch(error => {
          console.log(`API Adresse - Erreur : ${error.message}`);
        });
    } else {
      select.style.display = "none";
    }
};

function selectAddress(address) {
    const select = document.getElementById("selection");
    select.style.display = "none";
    
    const adresse = document.getElementById("address");
    setElementValue(adresse, address.properties.name);
    // address.value = adresse.properties.name;
    const codePostal = document.getElementById("postalCode")
    setElementValue(codePostal, address.properties.postcode);
    // postalCode.value = adresse.properties.postcode;

    const longitude = document.getElementById('longitude');
    const latitude =  document.getElementById('latitude');
    setElementValue(longitude, parseFloat(address.geometry.coordinates[0].toFixed(5)));
    setElementValue(latitude, parseFloat(address.geometry.coordinates[1].toFixed(5)));
    // longitude.value = adresse.geometry.coordinates[0];
    // latitude.value = adresse.geometry.coordinates[1];
    setMarker();

    getCommune(address.properties.citycode);
};

function locateAddress(adresse, inseeCommune) {
    const apiAdresse = 'https://api-adresse.data.gouv.fr/search';
    const request = apiAdresse + '/?q=' + adresse + '&citycode=' + inseeCommune;
    fetch(request)
      .then(response => {
        if (!response.ok) {
          throw new Error(`API Adresse - erreur HTTP : ${response.status}`);
        }
        var rep = response.json();
        return rep;
      })
      .then(data => {
        if (Object.keys(data.features).length > 0) {
          const longitude = document.getElementById('longitude');
          const latitude =  document.getElementById('latitude');
          setElementValue(longitude, parseFloat(data.features[0].geometry.coordinates[0].toFixed(5)));
          setElementValue(latitude, parseFloat(data.features[0].geometry.coordinates[1].toFixed(5)));
          // longitude.value = data.features[0].geometry.coordinates[0];
          // latitude.value = data.features[0].geometry.coordinates[1];
          setMarker();
        }
      })
      .catch(error => {
        console.log(`API Adresse - Erreur : ${error.message}`);
      }); 
};

/**
 * Vérifie si un numéro SIRET est valide en utilisant l'algorithme de Luhn.
 * @param {string} siret - Le numéro SIRET à vérifier (14 chiffres).
 * @returns {boolean} - `true` si le numéro SIRET est valide, sinon `false`.
 */
function verifierSiret(siret) {
    // Vérifie que le SIRET contient exactement 14 chiffres
    if (!/^\d{14}$/.test(siret)) {
        return false;
    }

    let somme = 0;
    for (let i = 0; i < siret.length; i++) {
        let chiffre = parseInt(siret[i], 10);

        // Double chaque chiffre d'indice impair (en comptant à partir de 0)
        if (i % 2 === 0) {
            chiffre *= 2;
            // Si le double est supérieur ou égal à 10, on soustrait 9
            if (chiffre >= 10) {
                chiffre -= 9;
            }
        }

        // Ajoute le chiffre (modifié ou non) à la somme totale
        somme += chiffre;
    }

    // Le numéro est valide si la somme est divisible par 10
    return somme % 10 === 0;
}

function aStr(part) {
  if (part == null) { return '' } else { return part + ' ' }
}

function chercheSIRET() {
       
  const siret = document.getElementById('siretNumber');

  if (verifierSiret(siret.value)) {
    const sireneKey = '5374c799-f1d8-4e9e-b4c7-99f1d8ee9ecf';
    const sireneUrl = 'https://api.insee.fr/api-sirene/3.11/siret?q=siret:';
    const requestOptions = {
      method: 'GET',
      headers: {
        'X-INSEE-Api-Key-Integration': sireneKey,
      },
    };  

    fetch(sireneUrl+siret.value, requestOptions)
      .then(response => {
        if (!response.ok) {
          throw new Error(`API Sirene - erreur HTTP : ${response.status}`);
        }
        var rep = response.json();
        return rep;
      })
      .then(data => {
        if (Object.keys(data.etablissements).length = 1) {
          data.etablissements.forEach(function (element) {
            const etablissement = document.getElementById('establishmentName');
            const adresse = document.getElementById('address');
            const codePostal = document.getElementById('postalCode');
            const ville = document.getElementById('city');
            
            if (etablissement.value == '') { 
              if (element.uniteLegale.categorieJuridiqueUniteLegale == '1000') {
                setElementValue(etablissement, element.uniteLegale.nomUniteLegale + ' ' + element.uniteLegale.prenomUsuelUniteLegale);
              } else {
                setElementValue(etablissement, element.uniteLegale.denominationUniteLegale);
              }
            }
            if (adresse.value == '' || codePostal.value == '' || ville.value == '') {
              setElementValue(adresse, 
                aStr(element.adresseEtablissement.numeroVoieEtablissement) + 
                aStr(element.adresseEtablissement.indiceRepetitionEtablissement) + 
                aStr(element.adresseEtablissement.typeVoieEtablissement) + 
                aStr(element.adresseEtablissement.libelleVoieEtablissement).trimEnd()
              );
              setElementValue(codePostal, element.adresseEtablissement.codePostalEtablissement);

              const inseeCommune = element.adresseEtablissement.codeCommuneEtablissement;
              locateAddress(adresse.value, inseeCommune)
              getCommune(inseeCommune);                    
            }
          });
        }
 
      })
      .catch(error => {
        console.log(`API Sirene - Erreur : ${error.message}`);
      });
  } else {
    siret.classList.add('warning');
    siret.addEventListener(
      'input',
      () => { siret.classList.remove('warning'); },
      'once'          
    );
    showModalBox('red','n°SIRET non valide','Merci de corriger le n° SIRET.');
  }
}

function updateTypeCas() {
    const suspicionDate = document.getElementById('suspicionDate');
    const confirmationDate = document.getElementById('confirmationDate');
    const infirmationDate = document.getElementById('infirmationDate');
    const selectedType = document.getElementById('caseType').value;

    let warning = document.createElement("p");
    warning.innerHTML = "&#9888";
    
    suspicionDate.disabled =
      (selectedType != 'Cas Suspect') && 
      (selectedType != 'Cas Confirmé') && 
      (selectedType != 'Cas Infirmé');
    confirmationDate.disabled = selectedType != 'Cas Confirmé';
    infirmationDate.disabled = selectedType != 'Cas Infirmé';

    if (suspicionDate.disabled) {
      suspicionDate.value = '';
      suspicionDate.removeAttribute('required');
      suspicionDate.removeAttribute('placeholder');
      suspicionDate.classList.remove('warning');
    } else {
      suspicionDate.setAttribute('required','');
      suspicionDate.setAttribute('placeholder', warning.textContent);
    }
    if (confirmationDate.disabled) {
      confirmationDate.value = '';
      confirmationDate.removeAttribute('required');
      confirmationDate.removeAttribute('placeholder');
      confirmationDate.classList.remove('warning');
    } else {
      confirmationDate.setAttribute('required','');
      confirmationDate.setAttribute('placeholder', warning.textContent);
    }
    if (infirmationDate.disabled) {
      infirmationDate.value = '';
      infirmationDate.removeAttribute('required');
      infirmationDate.removeAttribute('placeholder');
      infirmationDate.classList.remove('warning');
    } else {
      infirmationDate.setAttribute('required','');
      infirmationDate.setAttribute('placeholder', warning.textContent);
    }
}

/*
  Fonction affichant une boîte modale
  - En entrée : couleur, titre de la boîte et message à afficher dans la boîte
*/
function showModalBox(couleur, titre, message) {
  setTimeout(hideSpinner, 100);
  document.querySelector('#ModalBox .modal-content').style.border = '2px solid '+couleur;
  document.querySelector('#ModalBox .modal-header').style.backgroundColor = couleur;
  document.querySelector('#ModalBox .modal-title').textContent = titre;
  document.querySelector('#ModalBox .modal-body').innerHTML = '<p>'+message+'</p>';
  $('#ModalBox').modal('show');
}

/*
  Fonction affichant le 'spinner'
*/
function showSpinner() {
    document.getElementById("loadingSpinner").style.display = "flex";
}

/*
  Fonction masquant le 'spinner'
*/
function hideSpinner() {
    document.getElementById("loadingSpinner").style.display = "none";
}

/*
  Fonction retournant un objet de type date
  - En entrée : Une chaîne de caractère contenant une date au format 'dd/mm/yyyy'
  - En sortie : Un objet date
*/
function getDate(dateString) {
  var dateParts = dateString.split("/");
  var dateObject = new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0]);
  return dateObject;
}

/*
  Fonction vérifiant les règles de validation des données renseignées dans le formulaire
  (règles complémentaires à la règle vérifiant le renseignement des champs obligatoires)
  - en sortie : vrai si règles validées, faux sinon
*/
function checkValidity() {

    // initialisation de la validation des règles
    var validity = true;

    // règles de vérification des dates
    const suspicionDate = document.getElementById('suspicionDate');
    const confirmationDate = document.getElementById('confirmationDate');
    const infirmationDate = document.getElementById('infirmationDate');

    // règle 1 : si la date de confirmation est renseignée, elle ne peut pas être antérieure à la date de suspicion
    if (confirmationDate.value != null && getDate(confirmationDate.value) < getDate(suspicionDate.value)) {
      confirmationDate.classList.add('warning');
      confirmationDate.addEventListener(
        'input',
        () => {
          suspicionDate.classList.remove('warning');
          confirmationDate.classList.remove('warning');
        },
        'once'          
      );
      suspicionDate.classList.add('warning');
      suspicionDate.addEventListener(
        'input',
        () => {
          suspicionDate.classList.remove('warning');
          confirmationDate.classList.remove('warning');
        },
        'once'          
      );
      validateMsg.push('La date de confirmation ne peut pas être inférieure à la date de suspicion.');
      validity = false;
    }

    // règle 2 : si la date d'infirmation est renseignée, elle ne peut pas être antérieure à la date de suspicion
    if (infirmationDate.value && getDate(infirmationDate.value) < getDate(suspicionDate.value)) {
      infirmationDate.classList.add('warning');
      infirmationDate.addEventListener(
        'input',
        () => {
          suspicionDate.classList.remove('warning');
          infirmationDate.classList.remove('warning');
        },
        'once'          
      );      
      suspicionDate.classList.add('warning');
      suspicionDate.addEventListener(
        'input',
        () => {
          suspicionDate.classList.remove('warning');
          infirmationDate.classList.remove('warning');
        },
        'once'          
      );
      validateMsg.push('La date d\'infirmation ne peut pas être inférieure à la date de suspicion.');
      validity = false;
    }

    // règle de vérification du n°EDE
    const edeNumber = document.getElementById('edeNumber');

    // règle 3 : si le n°EDE est renseignée, le nombre de caractère du n°EDE ne peut pas être différent de 8
    if (edeNumber.value != '' && edeNumber.value.length != 8) {
      edeNumber.classList.add('warning');
      edeNumber.addEventListener(
        'input',
        () => { edeNumber.classList.remove('warning'); },
        'once'          
      );
      validateMsg.push('Le n°EDE doit comporter 8 carcatères.');
      validity = false;
    }

    // règle de vérification du n°SIRET et du n°NUMAGRIT
    const siretNumber = document.getElementById('siretNumber');
    const nagritNumber = document.getElementById('nagritNumber');

    // règle 4 : si le n°SIRET est renseignée, la vérification de ce SIRET par contrôle de la clé de Luhn doit être OK
    if (siretNumber.value != '' && !verifierSiret(siretNumber.value)) {
      siretNumber.classList.add('warning');
      siretNumber.addEventListener(
        'input',
        () => { siretNumber.classList.remove('warning'); },
        'once'          
      );
      validateMsg.push('Le n°SIRET renseigné n\'est pas valide, merci de vérifier.');
      validity = false;
    }

    // règle 5 : vérifier si le n°SIRET ou bien le n°NUMAGRIT sont renseignés (les 2 champs ne sont pas null ni tous les 2 renseignés)
    if ((siretNumber.value == '' && nagritNumber.value == '') || (siretNumber.value != '' && nagritNumber.value != ''))
    {
      siretNumber.classList.add('warning');
      siretNumber.addEventListener(
        'input',
        () => {
          siretNumber.classList.remove('warning');
          nagritNumber.classList.remove('warning');
        },
        'once'          
      );
      nagritNumber.classList.add('warning');
      nagritNumber.addEventListener(
        'input',
        () => {
          siretNumber.classList.remove('warning');
          nagritNumber.classList.remove('warning');
        },
        'once'          
      );
      validateMsg.push('Merci de renseigner soit le n°SIRET ou soit le NAGRIT.');

      validity = false;      
    }

    return validity;
}

/*
  Fonction de formatage d'une valeur en fonction de son type
  - En entrée : valeur et type
  - En sortie : valeur formatée
*/
function formatValue(value, type) {
  switch (type) {
    case 'int' :
      ret = parseInt(value);
      break;
    case 'float' :
      ret = parseFloat(value);
      break;
    case 'date' :
      ret = new Date(value.slice(0, 10).split('/').reverse().join('-'));
      break;
    default:
      ret =  value;
  }
  return ret;
}

/*
  Fonction permettant de générer un identifiant unique
  - En sortie : valeur de l'identifiant unique
*/
function uuidv4() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
    (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
  );
}

/*
  Créer un nouvel enregistrement et mise à jour de cet enregistrement à partir des données renseignées dans le formulaire
  Cas d'usage : Traitement déclenché si les données du formulaire sont valides pour créer un nouvel enregistrement
*/
async function addNewRecord() {

  console.log(`#DLA> add new record - start`);

  // Etape 1 : Création de l'enregistrement

  // indiquer un état d'un enregistrement nouvellement créé
  newRecord = true;
  // générer un identifiant unique
  recordUUID = uuidv4();
  // appel à l'API GRIST pour ajouter un enregistrement -> déclenche un évènement GRIST 'onRecords' 
  await grist.docApi.applyUserActions([
    ['AddRecord', workTable, null, {
      'Adresse': recordUUID
    }]
  ]);

  // Etape 2 : Mise à jour de cet enregistrement

  // temporisation d'une seconde pour attendre le déclenchement de l'évènement 'onRecords'
  setTimeout(function(){
    // indiquer un état de mise à jour d'un enregistrement nouvellement créé
    updateNewRec = true;
    // appel à l'API GRIST pour sélectionner le nouvel enregistrement -> déclenche un évèment GRIST 'onRecord'
    grist.setCursorPos({rowId: recordId});
  }, 1000);

  console.log(`#DLA> add new record - end`);

}

/*
  Mise à jour des données de l'enregistrement courant à partir des données renseignées dans le formulaire
  Cas d'usage : Traitement déclenché si les données du formulaire sont valides pour mettre à jour un enregistrement existant
*/
async function updateCurrentRecord() {

  console.log(`#DLA> update current record ${recordId} - start`);

  // indiquer un état de non mise à jour de l'enregistrement courant
  updateRec = false;

  // appel à l'API GRIST pour sélectionner l'enregistrement courant -> déclenche un évènement GRIST 'onRecord'
  grist.setCursorPos({rowId: recordId});

  // charger l'enregistrement courant
  record = await grist.docApi.fetchSelectedRecord(recordId);

  // mettre à jour l'enregistrement courant
  formField.forEach((column, field) => {
    const elt = document.getElementById(field);

    switch (column.access) {
      case 'RO':
        break;
      case 'RW':
        if (elt.value != '') {
          console.log(`#DLA> Mise à jour de la colonne ${column.name} avec la valeur ${elt.value} de type ${column.type}`);
          grist.docApi.applyUserActions([
            ['UpdateRecord', workTable, parseInt(recordId), {
              [column.name]: formatValue(elt.value, column.type)
            }]
          ]);
        }
        break;
      default:
        console.log(`#DLA> Mise à jour de la colonne ${column.name} : aucune action définie`);
    }
  });

  console.log(`#DLA> update current record ${recordId} - end`);

}

/*
  Vérification de la validité des données renseignées dans le formulaire
  Cas d'usage : Traitement suite à action sur le bouton 'valider' du formulaire
*/
function validateForm() {

  // afficher le 'spinner'
  showSpinner();

  // initialiser l'état de validation du formulaire
  let isValid = true;

  // référencer dans la zone de déclaration du formulaire tous les champs à renseigner
  const form = document.getElementById('declarationForm');
  const inputs = form.querySelectorAll('input, select, textarea');

  // retirer le marquage 'warning' pour ces champs
  inputs.forEach(input => {
    input.classList.remove('warning');
  });

  // vérifier si tous les champs obligatoires sont bien renseignés
  inputs.forEach(input => {
      // si le champ est obligatoire et qu'il n'est pas renseigné
      if (input.hasAttribute('required') && !input.value.trim()) {
          // ajouter un marque 'warning' pour ce champs
          input.classList.add('warning');
          // marquer le formulaire comme 'non valide'
          isValid = false;
          // ajouter un écouteur pour retirer le marquage 'warning' lors de toutes saisies dans ce champ
          input.addEventListener(
            'input',
            () => { input.classList.remove('warning');},
            'once'          
          );
      }
  });

  // initialiser le message des erreurs de validation du formulaire
  validateMsg = [];
  // si au moins un champ obligatoire n'est pas renseigné
  if (!isValid) {
    // ajouter un message signalant ce problème
    validateMsg.push('Merci de renseigner tous les champs obligatoires : &#9888');
  }

  // si les règles de validation sont OK
  if (checkValidity() && isValid) {
    
    // vérifier si le formulaire est en mode création
    if (viewMode == vNew) {
      // si oui, essayer d'ajouter un nouvel enregistrement et de le mettre à jour avec les données du formulaire
      try {
        addNewRecord();
      } catch (erreur) {
        // en cas d'échec, signaler dans la console
        console.error('Erreur lors de la création de l\'enregistrement', erreur);
        // et par une boîte modale d'erreur
        showModalBox('red','Enregistrement impossible','Erreur lors de la création.');
      }
    // sinon vérifier si le formulaire est en mode édition
    } else if (viewMode == vEdit) {
      // si oui, essayer de mettre à jour l'enregistrement courant avec les données du formulaire
      try {
        updateCurrentRecord();
      } catch (erreur) {
        // en cas d'échec, signaler dans la console
        console.error('Erreur lors de la mise à jour de l\'enregistrement', erreur);
        // et par une boîte modale d'erreur
        showModalBox('red','Enregistrement impossible','Erreur lors de la mise à jour.');
      }
      // temporisation de 2 secondes pour attendre le traitement de l'évènement 'onrecord'
      setTimeout(function(){
        // si la mise à jour est OK après gestion de l'évènement 'onrecord'
        if (updateRec) {
          // afficher le message de mise à jour réussie
          showModalBox('green','Enregistrement réussi','La déclaration n° '+recordRef+' a été mise à jour.');
        } else {
          // sinon, afficher le message avertissant que l'enregistrement n'a pas été modifié
          showModalBox('orange','Enregistrement non modifié','La déclaration n° '+recordRef+' n\'a pas été mise à jour.');
        }
      }, 2000);

    }
  } else {
    // si formulaire n'est pas valide,
    var modalMsg = validateMsg[0];
    // concatener l'ensemble des erreurs
    if (validateMsg.length > 1) {
      validateMsg.slice(1).forEach((msg) => {
        modalMsg = modalMsg + '<br>' + msg;
      });
    }
    // afficher une boîte modale signalant les erreurs 
    showModalBox('red','Déclaration non valide', modalMsg);
  }
}

/*
  Fonction GRIST d'initialisation du widget
  (évènement déclenché au chargement de ce widget)
*/
grist.ready({
  requiredAccess: 'read table',
  allowSelectBy: true
});

/*
  Fonction GRIST appeler lors du déclenchement de l'évènement 'onRecords'
  (évènement déclenché lors de toutes modifications de la liste des enregistrements de la table associée)
*/
grist.onRecords(function (records) {
  // vérifier si un nouvel enregistrement a été créé
  if (newRecord) {
    // si oui, parcourir les enregistrements
    records.forEach(record => {
      // vérifier si l'enregistrement est marqué par l'identifiant unique
      if (record['Adresse'] == recordUUID) {
        // si oui alors il correspond au nouvel enregistrement créé : conserver son id
        recordId = record.id;
      } 
    });
  }
});

/*
  Fonction GRIST appeler lors du déclenchement de l'évènement 'onRecord'
  (évènement déclenché lors de toute sélection d'un enregistrement dans la table associée)
*/
grist.onRecord(function (record) {

  // si le mode est formulaire (édition ou création)
  if (viewMode == vEdit || viewMode == vNew) {
    // Vérifier s'il y a une demande de mise à jour en cours pour un nouvel enregistrement
    if (newRecord && updateNewRec) {
      
      // Vérifier si l'enregistement en cours correspond au bien nouvel enregistrement
      if (record.id == recordId && record['Adresse'] == recordUUID) {

        // Séquence de mise à jour du nouvel enregistrement avec les données du formulaire
        formField.forEach((column, field) => {
          const elt = document.getElementById(field);
          switch (column.access) {
            case 'RO':
              console.log(`#DLA> Lecture de la colonne ${column.name} avec la valeur : ${record[column.name]}`);
              if (elt.nodeName == 'H6') {
                elt.innerHTML = record[column.name];
              } else {
                elt.value = record[column.name];
              }
              // mettre à jour les informations sur l'enregistrement
              switch (field) {
                // - Le n° de cas
                case 'caseNumber':
                  recordRef = elt.value;
                  break;
                // - La date de dernière mise à jour
                case 'updatedDate':
                  lastUpdate = elt.innerHTML;
                  break;
              }
              break;
            case 'RW':
                if (elt.value != '') {
                  console.log(`#DLA> Ecriture dans la colonne ${column.name} de la valeur ${elt.value} de type ${column.type}`);
                  grist.docApi.applyUserActions([
                    ['UpdateRecord', workTable, record.id, {
                      [column.name]: formatValue(elt.value, column.type)
                    }]
                  ]);
                }
              break;
            default:
              console.log(`#DLA> Ecriture dans la colonne ${column.name} : aucune action définie`);
          }
        });
        // mettre les indicateurs de création d'enregistrement à faux
        newRecord = false;
        updateNewRec = false;
        // afficher les informations de traçabilité
        const createdTag = document.getElementById('createdTag');
        createdTag.hidden = false;
        const updatedTag = document.getElementById('updatedTag');
        updatedTag.hidden = false;
        // inactiver l'indicateur de mise à jour
        updateRec = false;
        // passer le formulaire en mode 'édition'
        viewMode = vEdit;
        // afficher le message de création réussie
        showModalBox('green','Enregistrement réussi','Votre déclaration a été prise en compte sous le n° '+recordRef);

      } else {

        // si l'enregistrement en cours ne correspond pas au nouvel enregistrement
        // alors afficher le message de création impossible
        showModalBox('red','Enregistrement impossible','Une erreur est survenue : la déclaration n\'a pas été enregistrée.');

      }

    } else {

      // si l'enregistrement en cours n'est pas un nouvel enregistrement
      // alors vérifier si l'indicateur de mise à jour n'est pas actif
      if (!updateRec) {
        // si aucune mise à jour n'est en cours
        // alors vérifier si l'enregistrement a été modifié
        updateRec = (lastUpdate != record['Modifie_Le'])
        if (updateRec) {
          // si oui, alors
          // pour chaque champ du formulaire
          formField.forEach((column, field) => {
            // sélectionner le champ du formulaire associé à la colonne
            const elt = document.getElementById(field);
            // si le colonne est de type 'ReadOnly'
            if (column.access == 'RO') { 
              // si l'élément est de type H6
              if (elt.nodeName == 'H6') {
                // mettre à jour la propriété 'innerHTML' avec la valeur de cette colonne
                elt.innerHTML = record[column.name];
              } else {
                // sinon, mettre à jour la propriété 'value' avec la valeur de cette colonne
                elt.value = record[column.name];
              }
            }
            // stocker la date de dernière modification
            if (field = 'updatedDate') {
              lastUpdate = elt.innerHTML;
            }
          });
        }
      }
      
    }
  }

  // si le mode est Menu
  if (viewMode == vMenu) {
    // mettre à jour l'id de l'enregistrement courant
    recordId = record.id;
  }

});

/*
  Fonction renvoyant la clé associée à la valeur d'une liste
  - En entrée : valeur et liste
  - En sortie : clé associée à la valeur
*/
function getKeyByValue(value, list) {
  const ref = refList.get(list);

  return [...ref.entries()].reduce((acc, [key, val]) => {
      if (val === value) return key;
      return acc;
  }, undefined);
}

/*
  Chargement du formulaire avec les données de l'enregistrement en cours d'édition
  Cas d'usage : Traitement suite à action sur le bouton 'Editer' du menu
*/
async function getCurrentRecord() {

    // essayer de charger cet enregistrement
    updateRec = true;
    record = await grist.docApi.fetchSelectedRecord(recordId);

    // vérifier si cet enregistrement existe
    if (record.id !=  Object.values(record).join("")) {
  
      console.log(`#DLA> get current record ${recordId} - start`);

      // pour chaque champ du formulaire
      formField.forEach((column, field) => {

          // sélectionner le champ du formulaire associé à la colonne
          const elt = document.getElementById(field);

          // retirer un éventuel marquage 'warning' de ce champ
          elt.classList.remove('warning');

          // informer de la mise à jour de ce champ avec la valeur de cette colonne
          console.log(`#DLA> Chargement du champ ${field} avec la valeur de la colonne ${column.name} : ${record[column.name]}`);

          // vérifier si la valeur de la colonne est pas associée à une liste de référence
          if (column.liste) {

            // si oui, mettre à jour la propriété 'value' avec la clé associée à la valeur de cette colonne dans la liste de référence
            elt.value = getKeyByValue(record[column.name], column.liste);
            if (column.liste == refSpeciesGroup) {
              updateSpeciesOptions()
            }

          // sinon, si l'élément est de type H6
          } else if (elt.nodeName == 'H6') {
            // mettre à jour la propriété 'innerHTML' avec la valeur de cette colonne
            elt.innerHTML = record[column.name];
            
          // sinon, si la colonne associée à l'élément est de type date
          } else if (column.type == 'date') {
            if (record[column.name]) {
              const value = String(record[column.name]);
              elt.parentElement._flatpickr.setDate(value.slice(0, 10).split('-').reverse().join('/'));
            }

          // sinon, mettre à jour la propriété 'value' avec la valeur de cette colonne
          } else {
            if (record[column.name]) {
              elt.value = record[column.name];
            } else {
              elt.value = '';
            }
          }

          // mettre à jour les informations sur l'enregistrement
          switch (field) {
            // - Le n° de cas
            case 'caseNumber':
              recordRef = elt.value;
              break;
            // - La date de dernière mise à jour
            case 'updatedDate':
              lastUpdate = elt.innerHTML;
              break;
          }

          // initialise les variables
          newRecord = false;
          updateNewRec = false;
          updateRec = false;
          lastupdate = '';

      });

      // actualiser le type de cas
      updateTypeCas();

      // afficher le point sur la carte
      setMarker();

      // afficher les informations de traçabilité
      const createdTag = document.getElementById('createdTag');
      createdTag.hidden = false;
      const updatedTag = document.getElementById('updatedTag');
      updatedTag.hidden = false;
      
    }

}

/*
  Initialisation du formulaire avec l'ensemble des champs non renseignés
  Cas d'usage : Traitement suite à action sur le bouton 'Créer' du menu
*/
function initForm() {

  console.log(`#DLA> initialize form - start`);

  // pour chaque champ du formulaire
  formField.forEach((column, field) => {

    // sélectionner le champ du formulaire associé à la colonne
    const elt = document.getElementById(field);

    // retirer un éventuel marquage 'warning' de ce champ
    elt.classList.remove('warning');

    // si l'élément est de type H6
    if (elt.nodeName == 'H6') {
      // vider la valeur associée à la propriété 'innerHTML'
      elt.innerHTML = '';
    // sinon, si la colonne associée à l'élément est de type date
    } else if (column.type == 'date') {
      elt.parentElement._flatpickr.setDate('');
    // sinon, mettre à jour la propriété 'value' avec la valeur de cette colonne
    } else {
        elt.value = '';
    }

  });

  // initialise le pointeur sur la carte
  initMarker();

  // initialise les variables
  // recordId = -1;
  // recordRef = '';
  newRecord = false;
  updateNewRec = false;
  updateRec = false;
  lastupdate = '';

  console.log(`#DLA> initialize form - end`);

}

/*
  Génére un fichier PDF reprenant les données des champs du formulaire
  Cas d'usage : Traitement suite à action sur le bouton 'PDF' du formulaire
*/
function printForm() {

  showSpinner();

  // initialiser le document PDF
  // (orientation 'portrait', unite:'point', format de page:'a4')
  const doc = new jspdf.jsPDF('p', 'pt', 'a4');
  const today = new Date().toISOString().split('T')[0];
  const name = recordRef + '_' + today + '.pdf'
  const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
  const linespace = 1.6;
  const col = {
    'C0':30,
    'C2':pageWidth/2,
    'C3':pageWidth/3,
    'C6':2*pageWidth/3
  };
  // gestion du curseur d'insertion du texte dans le document PDF
  var csr = {
    'xPos' : col['C2'],
    'yPos' : 152
  };
  var value = '';
  var label = '';
  var text = '';
  var indent = '';
  var img = new Image();

  // fonction ajoutant du texte dans le document PDF
  // text     : le texte à ajouter
  // align    : alignement par rapport à la valeur de la position horizontale dans la ligne
  // linefeed : avancement en nombre de ligne suite à l'ajout du texte
  // indent   : texte d'indentation permettant de calculer un décalage de la position horizontale
  // fontsize : taille de la police
  function printText(text, align, linefeed, indent, fontsize) {

    // si la taille de la police est définie
    if (fontsize) {
      // affecter cette taille au document PDF
      doc.setFontSize(fontsize);
      // calculer la nouvelle hauteur de ligne
      lineHeight = fontsize * linespace;
    }
    // insérer le texte dans le document PDF
    // à la position actuelle du curseur
    // avec l'alignement souhaité
    if (align) {
      doc.text(text, csr.xPos, csr.yPos, {align: align})
    } else {
      doc.text(text, csr.xPos, csr.yPos, {align: 'left'})
    }

    // calculer la nouvelle position du curseur dans le document PDF
    // si pas d'avancement de ligne
    if (linefeed == 0) {
      // alors :
      // - la position Y n'est pas modifiée
      // - la position X est recalculée en ajoutant :
      csr.xPos =
        csr.xPos + 
        // - la dimension horizontale du texte inséré + un espace
        (doc.getStringUnitWidth(text+" ") * doc.internal.getFontSize()) +
        // - la dimension horizontale du texte d'indentation
        (doc.getStringUnitWidth(indent) * doc.internal.getFontSize());
    } else {
      // sinon :
      // - la position Y est recalculée en ajoutant la hauteur du nombre de ligne
      csr.yPos = csr.yPos + lineHeight * linefeed;
      // - la position X est recalculée depuis la marge gauche en ajoutant la dimension horizontale du texte d'indentation
      csr.xPos = col['C0'] + (doc.getStringUnitWidth(indent) * doc.internal.getFontSize());
    }
  };

  // insérer le logo du ministère
  img.crossOrigin = 'anonymous';
  img.src = logo_agriculture;
  doc.addImage(img, 'png', 18, 14, 184, 118)

  // Parcourir le paramétrage du texte à insérer dans le formulaire
  printParam.forEach((param, field) => {

    // vérifier si le champ n'est pas un simple 'LineFeed'
    if (!field.match(/#LF.*/)) {
    
      // sélectionner l'élèment associé à ce champ du formulaire
      const elt = document.getElementById(field);

      // vérifier que l'élément est défini
      if (elt) {

        // initialiser la valeur de cet élément
        // si l'élément est de type liste
        if (param.liste) {
          // initialiser avec la valeur dans la liste de référence
          // (la propriété 'value' de l'élèment contient la clé associée dans cette liste)
          value = refList.get(param.liste).get(parseInt(elt.value));
        // sinon si l'élément est de type H6
        } else if (elt.nodeName == 'H6') {
          // la valeur est donnée par la propriété 'innerHTML'
          value = elt.innerHTML;
        // sinon,
        } else {
          // la valeur est donnée par la propriété 'value'
          value = elt.value;
        }

        // si la valeur n'est pas définie
        if (!value) {
          // initialiser une chaine vide dans
          value = '';
          indent = '';
        }

        // si la présence du champ est obligatoire ou s'il existe une valeur pour le champ
        if (param.required || value != '') {
          // initialiser le texte du label associé à ce champ
          label = document.querySelector(`label[for="${elt.id}"]`).textContent;
          // le texte à insérer est déterminer selon le paramètre 'replace' associé au champ
          text = param.print.replace('#V', value).replace('#L',label);
          // déterminer le texte nécessaire au calcul du retrait
          if (param.indent) {
            indent = param.indent.replace('#V', value).replace('#L',label);
          } else {
            indent = '';
          }
        // sinon
        } else {
          // insérer une chaine vide dans le document PDF
          text = '';
          indent = '';
        }

      }

    // sinon s'il s'agit d'un simple 'LineFeed'
    } else {
        // insérer une chaine vide dans le document PDF
        text = ''
        // si un texte par défaut est paramétré
        if (param.print) {
          // insérer ce texte
          text = param.print;
        // sinon
        } else {
          // insérer une chaine vide
          text = ''
        }
        indent = '';
    }

    // initialiser la position horizontale dans la ligne
    if (param.xPos) {
      csr.xPos = col[param.xPos];
    }
    
    // insérer le champ dans le document
    printText(text, param.align, param.linefeed, indent, param.fontsize)
    
  });

  // insérer le pied de page
  let str = `Document imprimé le ${ today.slice(0, 10).split('-').reverse().join('/')}`;
  doc.setTextColor(100);
  doc.setFontSize(10);
  doc.text(str, pageWidth / 2, pageHeight  - 10, {align: 'center'});

  // insérer la carte en tant que composant HTML
  const viewerDiv = document.getElementById('viewerDiv')
  leafletImage(map, function(err, canvas) {
    var dimensions = map.getSize();
    img.crossOrigin = 'anonymous';
    img.width = dimensions.x;
    img.height = dimensions.y;
    img.src = canvas.toDataURL();
    const x = (pageWidth - viewerDiv.clientWidth) / 2;
    const y = pageHeight - viewerDiv.clientHeight - 50
    doc.addImage(img, 'png', x, y, viewerDiv.clientWidth, viewerDiv.clientHeight);
    doc.save(name);
    hideSpinner();
  });

}