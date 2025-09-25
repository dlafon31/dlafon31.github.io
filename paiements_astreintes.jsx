const Component = () => {
  const [astreintes, setAstreintes] = useState([]);
  const [gestionnaires, setGestionnaires] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [statistics, setStatistics] = useState({
    totalPrevues: 0,
    totalValidees: 0,
    totalEligibles: 0,
    totalPayees: 0,
    aPayerEtat: 0,
    aPayerEnvt: 0
  });
  const [formData, setFormData] = useState({
    budget: '',
    gestionnaire: '',
    commentaire: ''
  });
  const [processing, setProcessing] = useState(false);

  useEffect(() => { 
    loadData(); 
    initializeDefaultDate();
  }, []);

  useEffect(() => {
    if (selectedMonth && selectedYear) {
      calculateStatistics();
    }
  }, [selectedMonth, selectedYear, astreintes]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        astreintesData, 
        gestionnairesData,
        utilisateursData,
        servicesData
      ] = await Promise.all([
        gristAPI.getData('Astreintes'), 
        gristAPI.getData('Gestionnaires'),
        gristAPI.getData('Utilisateurs'),
        gristAPI.getData('Services')
      ]);
      
      setAstreintes(Array.isArray(astreintesData) ? astreintesData : []);
      setGestionnaires(Array.isArray(gestionnairesData) ? gestionnairesData : []);
      setUtilisateurs(Array.isArray(utilisateursData) ? utilisateursData : []);
      setServices(Array.isArray(servicesData) ? servicesData : []);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      setAstreintes([]);
      setGestionnaires([]);
      setUtilisateurs([]);
      setServices([]);
    } finally { 
      setLoading(false); 
    }
  };

  const initializeDefaultDate = () => {
    const today = new Date();
    const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    setSelectedYear(previousMonth.getFullYear().toString());
    setSelectedMonth(String(previousMonth.getMonth() + 1).padStart(2, '0'));
  };

  const calculateStatistics = () => {
    if (!selectedMonth || !selectedYear || !astreintes.length) {
      setStatistics({
        totalPrevues: 0,
        totalValidees: 0,
        totalEligibles: 0,
        totalPayees: 0,
        aPayerEtat: 0,
        aPayerEnvt: 0
      });
      return;
    }

    const monthNumber = parseInt(selectedMonth) - 1;
    const yearNumber = parseInt(selectedYear);

    const monthAstreintes = astreintes.filter(astreinte => {
      const astreinteDate = new Date(astreinte.Date * 1000);
      return astreinteDate.getFullYear() === yearNumber && 
             astreinteDate.getMonth() === monthNumber;
    });

    const aPayerEtatFilter = monthAstreintes.filter(a => {
      const result = a.Rem_APayer === true && 
                     (a.Rem_Payee === false || a.Rem_Payee === null || a.Rem_Payee === undefined) && 
                     (a.Rem_Support === 'ETAT' || a.Rem_Support === 'ÉTAT');
      return result;
    });

    const aPayerEnvtFilter = monthAstreintes.filter(a => {
      const result = a.Rem_APayer === true && 
                     (a.Rem_Payee === false || a.Rem_Payee === null || a.Rem_Payee === undefined) && 
                     a.Rem_Support === 'ENVT';
      return result;
    });

    console.log('À payer ETAT:', aPayerEtatFilter.length);
    console.log('À payer ENVT:', aPayerEnvtFilter.length);

    const stats = {
      totalPrevues: monthAstreintes.length,
      totalValidees: monthAstreintes.filter(a => a.ValidationService === true).length,
      totalEligibles: monthAstreintes.filter(a => a.Rem_APayer === true).length,
      totalPayees: monthAstreintes.filter(a => a.Rem_APayer === true && a.Rem_Payee === true).length,
      aPayerEtat: aPayerEtatFilter.length,
      aPayerEnvt: aPayerEnvtFilter.length
    };

    setStatistics(stats);
  };

  const getMonthName = (monthNumber) => {
    const months = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];
    return months[parseInt(monthNumber) - 1] || '';
  };

  const handleValidatePaiement = async () => {
    if (!formData.budget || !formData.gestionnaire) {
      alert('Veuillez renseigner le budget et le gestionnaire');
      return;
    }

    const astreintesToPay = getAstreintesToPay();
    if (astreintesToPay.length === 0) {
      alert('Aucune astreinte à payer pour ce budget');
      return;
    }

    if (!confirm(`Confirmer la mise en paiement de ${astreintesToPay.length} astreinte${astreintesToPay.length > 1 ? 's' : ''} sur le budget ${formData.budget} ?`)) {
      return;
    }

    setProcessing(true);

    try {
      // 1. Créer l'état de paiement
      const monthName = getMonthName(selectedMonth);
      const etatNom = `Etat paiement ${monthName} ${selectedYear} - Budget ${formData.budget}`;
      const currentTimestamp = Math.floor(Date.now() / 1000);
	  
	  const gestionnaireRecord = gestionnaires.find(g => g.id === parseInt(formData.gestionnaire));
	  const gestionnairePrenomNom = gestionnaireRecord ? gestionnaireRecord.PrenomNom : '';

      await gristAPI.addRecord('Astreintes_Etats', {
        Nom: etatNom,
        Date_EtatPaiement: currentTimestamp,
        Support: formData.budget,
        Gestionnaire: gestionnairePrenomNom,
        Commentaire: formData.commentaire || ''
      });

      // 2. Récupérer l'enregistrement créé pour obtenir sa valeur Ref
      const etatsData = await gristAPI.getData('Astreintes_Etats');
      const etatCree = etatsData.find(e => e.Nom === etatNom);
      
      if (!etatCree) {
        throw new Error('Impossible de retrouver l\'état de paiement créé');
      }

      // 3. Copier les astreintes vers Astreintes_Payées
      const anneeMonth = `${selectedYear}-${selectedMonth}`;

      for (const astreinte of astreintesToPay) {
        await gristAPI.addRecord('Astreintes_Payees', {
          Ref_Astreinte: astreinte.Ref,
          Ref_Etat: etatCree.Ref,
          PrenomNom: astreinte.Rem_PrenomNom,
          Statut: astreinte.Rem_Statut,
          Support: astreinte.Rem_Support,
          Service: astreinte.Rem_Service,
          Date_Astreinte: astreinte.Date
        });

      }

      alert(`Mise en paiement réussie ! ${astreintesToPay.length} astreinte${astreintesToPay.length > 1 ? 's' : ''} ${astreintesToPay.length > 1 ? 'ont été mises' : 'a été mise'} en paiement.`);
      
      // Réinitialiser le formulaire
      setFormData({
        budget: '',
        gestionnaire: '',
        commentaire: ''
      });

      // Recharger les données
      await loadData();

    } catch (error) {
      console.error('Erreur lors de la mise en paiement:', error);
      alert('Erreur lors de la mise en paiement: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getAstreintesToPay = () => {
    if (!selectedMonth || !selectedYear || !formData.budget) return [];

    const monthNumber = parseInt(selectedMonth) - 1;
    const yearNumber = parseInt(selectedYear);

    return astreintes.filter(astreinte => {
      const astreinteDate = new Date(astreinte.Date * 1000);
      const matchesDate = astreinteDate.getFullYear() === yearNumber && 
                         astreinteDate.getMonth() === monthNumber;
      const isEligible = astreinte.Rem_APayer === true;
      const isNotPaid = astreinte.Rem_Payee === false || astreinte.Rem_Payee === null || astreinte.Rem_Payee === undefined;
      const matchesBudget = (formData.budget === 'ETAT' && (astreinte.Rem_Support === 'ETAT' || astreinte.Rem_Support === 'ÉTAT')) ||
                           (formData.budget === 'ENVT' && astreinte.Rem_Support === 'ENVT');
      
      return matchesDate && isEligible && isNotPaid && matchesBudget;
    });
  };

  const isResponsable = () => {
    if (!utilisateurs || utilisateurs.length === 0) return false;
    const premierUtilisateur = utilisateurs[0];
    return premierUtilisateur.Responsable === true;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '30px' }}>
        <div style={{ fontSize: '36px', marginBottom: '15px' }}>💰</div>
        <div>Chargement de la gestion des paiements...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '15px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* En-tête compacte */}
      <div style={{
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        color: 'white',
        padding: '15px',
        borderRadius: '8px',
        textAlign: 'center',
        marginBottom: '20px'
      }}>
        <h1 style={{ 
          fontSize: '1.3rem', 
          margin: '0 0 5px 0', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '8px' 
        }}>
          💰 Gestion des Paiements des Astreintes
        </h1>
        <p style={{ fontSize: '0.9rem', margin: '0', opacity: '0.9' }}>
          Mise en paiement et suivi des rémunérations d'astreintes
        </p>
      </div>

      {/* Sélection du mois et statistiques sur la même ligne */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedMonth && selectedYear ? '1fr 2fr' : '1fr',
        gap: '20px',
        marginBottom: '20px'
      }}>
        {/* Sélection du mois */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 15px 0', color: '#1f2937', fontSize: '18px' }}>
            📅 Sélection du mois
          </h2>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'end', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#374151', fontSize: '13px' }}>
                Mois
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  minWidth: '140px'
                }}
              >
                <option value="">Sélectionner</option>
                {Array.from({ length: 12 }, (_, i) => {
                  const month = String(i + 1).padStart(2, '0');
                  const monthName = new Date(2000, i, 1).toLocaleDateString('fr-FR', { month: 'long' });
                  return (
                    <option key={month} value={month}>
                      {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#374151', fontSize: '13px' }}>
                Année
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  minWidth: '100px'
                }}
              >
                <option value="">Sélectionner</option>
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedMonth && selectedYear && (
              <div style={{
                background: '#f3f4f6',
                padding: '8px 15px',
                borderRadius: '6px',
                fontWeight: '500',
                color: '#1f2937',
                fontSize: '14px',
                whiteSpace: 'nowrap'
              }}>
                {getMonthName(selectedMonth)} {selectedYear}
              </div>
            )}
          </div>
        </div>

        {/* Statistiques du mois */}
        {selectedMonth && selectedYear && (
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ margin: '0 0 15px 0', color: '#1f2937', fontSize: '18px' }}>
              📊 Statistiques - {getMonthName(selectedMonth)} {selectedYear}
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '12px'
            }}>
              <div style={{
                background: '#f8fafc',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '20px', color: '#3b82f6', fontWeight: 'bold', marginBottom: '4px' }}>
                  {statistics.totalPrevues}
                </div>
                <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '500' }}>Prévues</div>
              </div>

              <div style={{
                background: '#f0fdf4',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #bbf7d0',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '20px', color: '#10b981', fontWeight: 'bold', marginBottom: '4px' }}>
                  {statistics.totalValidees}
                </div>
                <div style={{ color: '#16a34a', fontSize: '11px', fontWeight: '500' }}>Validées</div>
              </div>

              <div style={{
                background: '#fefce8',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #fde047',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '20px', color: '#eab308', fontWeight: 'bold', marginBottom: '4px' }}>
                  {statistics.totalEligibles}
                </div>
                <div style={{ color: '#ca8a04', fontSize: '11px', fontWeight: '500' }}>Éligibles</div>
              </div>

              <div style={{
                background: '#f0f9ff',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #7dd3fc',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '20px', color: '#0284c7', fontWeight: 'bold', marginBottom: '4px' }}>
                  {statistics.totalPayees}
                </div>
                <div style={{ color: '#0369a1', fontSize: '11px', fontWeight: '500' }}>Payées</div>
              </div>

              <div style={{
                background: '#fef2f2',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #fecaca',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '20px', color: '#dc2626', fontWeight: 'bold', marginBottom: '4px' }}>
                  {statistics.aPayerEtat}
                </div>
                <div style={{ color: '#b91c1c', fontSize: '11px', fontWeight: '500' }}>À payer ÉTAT</div>
              </div>

              <div style={{
                background: '#f3e8ff',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #d8b4fe',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '20px', color: '#9333ea', fontWeight: 'bold', marginBottom: '4px' }}>
                  {statistics.aPayerEnvt}
                </div>
                <div style={{ color: '#7c3aed', fontSize: '11px', fontWeight: '500' }}>À payer ENVT</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mise en paiement */}
      {selectedMonth && selectedYear && isResponsable() && (
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: '0 0 15px 0', color: '#1f2937', fontSize: '18px' }}>
            💳 Mise en paiement des astreintes
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                Budget * 
                <span style={{ color: '#ef4444', marginLeft: '4px' }}>obligatoire</span>
              </label>
              <select
                value={formData.budget}
                onChange={(e) => setFormData({...formData, budget: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: 'white'
                }}
              >
                <option value="">Sélectionner un budget</option>
                <option value="ENVT">ENVT</option>
                <option value="ETAT">ÉTAT</option>
              </select>
              {formData.budget && (
                <div style={{
                  marginTop: '6px',
                  padding: '6px 10px',
                  background: formData.budget === 'ETAT' ? '#fee2e2' : '#f3e8ff',
                  color: formData.budget === 'ETAT' ? '#dc2626' : '#9333ea',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {getAstreintesToPay().length} astreinte{getAstreintesToPay().length > 1 ? 's' : ''} à payer
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                Gestionnaire * 
                <span style={{ color: '#ef4444', marginLeft: '4px' }}>obligatoire</span>
              </label>
              <select
                value={formData.gestionnaire}
                onChange={(e) => setFormData({...formData, gestionnaire: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: 'white'
                }}
              >
                <option value="">Sélectionner un gestionnaire</option>
                {gestionnaires.map(gestionnaire => (
                  <option key={gestionnaire.id} value={gestionnaire.id}>
                    {gestionnaire.PrenomNom}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
              Commentaire <span style={{ color: '#6b7280', fontWeight: '400' }}>(facultatif)</span>
            </label>
            <textarea
              value={formData.commentaire}
              onChange={(e) => setFormData({...formData, commentaire: e.target.value})}
              placeholder="Commentaire sur cette mise en paiement..."
              rows={2}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ textAlign: 'center' }}>
            <button
              onClick={handleValidatePaiement}
              disabled={!formData.budget || !formData.gestionnaire || processing || getAstreintesToPay().length === 0}
              style={{
                background: (!formData.budget || !formData.gestionnaire || processing || getAstreintesToPay().length === 0) 
                  ? '#d1d5db' 
                  : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: (!formData.budget || !formData.gestionnaire || processing || getAstreintesToPay().length === 0) 
                  ? '#9ca3af' 
                  : 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: (!formData.budget || !formData.gestionnaire || processing || getAstreintesToPay().length === 0) 
                  ? 'not-allowed' 
                  : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                minWidth: '200px'
              }}
            >
              {processing ? (
                <>
                  <span>⏳</span>
                  <span>Traitement en cours...</span>
                </>
              ) : (
                <>
                  <span>💳</span>
                  <span>Valider la mise en paiement</span>
                </>
              )}
            </button>
            
            {(!formData.budget || !formData.gestionnaire) && (
              <div style={{
                marginTop: '8px',
                color: '#ef4444',
                fontSize: '13px',
                fontWeight: '500'
              }}>
                Veuillez renseigner le budget et le gestionnaire
              </div>
            )}
            
            {formData.budget && formData.gestionnaire && getAstreintesToPay().length === 0 && (
              <div style={{
                marginTop: '8px',
                color: '#f59e0b',
                fontSize: '13px',
                fontWeight: '500'
              }}>
                Aucune astreinte à payer pour ce budget
              </div>
            )}
          </div>
        </div>
      )}

      {!isResponsable() && selectedMonth && selectedYear && (
        <div style={{
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          padding: '15px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>🔒</div>
          <div style={{ color: '#92400e', fontSize: '14px', fontWeight: '500' }}>
            Seuls les responsables peuvent effectuer des mises en paiement
          </div>
        </div>
      )}
    </div>
  );
};