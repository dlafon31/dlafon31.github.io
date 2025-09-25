const Component = () => {
  const [etats, setEtats] = useState([]);
  const [astreintesPayees, setAstreintesPayees] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEtats, setSelectedEtats] = useState(new Set());
  const [processing, setProcessing] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [etatsData, astreintesPayeesData, utilisateursData] = await Promise.all([
        gristAPI.getData('Astreintes_Etats'),
        gristAPI.getData('Astreintes_Payees'),
        gristAPI.getData('Utilisateurs')
      ]);
      
      setEtats(Array.isArray(etatsData) ? etatsData : []);
      setAstreintesPayees(Array.isArray(astreintesPayeesData) ? astreintesPayeesData : []);
      setUtilisateurs(Array.isArray(utilisateursData) ? utilisateursData : []);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      setEtats([]);
      setAstreintesPayees([]);
      setUtilisateurs([]);
    } finally {
      setLoading(false);
    }
  };

  const isResponsable = () => {
    if (!utilisateurs || utilisateurs.length === 0) return false;
    const premierUtilisateur = utilisateurs[0];
    return premierUtilisateur.Responsable === true;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).toLocaleDateString('fr-FR');
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).toLocaleString('fr-FR');
  };

  const totalPages = Math.ceil(etats.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEtats = etats.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setSelectedEtats(new Set());
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const currentIds = new Set(currentEtats.map(etat => etat.id));
      setSelectedEtats(currentIds);
    } else {
      setSelectedEtats(new Set());
    }
  };

  const handleSelectEtat = (etatId, checked) => {
    const newSelected = new Set(selectedEtats);
    if (checked) {
      newSelected.add(etatId);
    } else {
      newSelected.delete(etatId);
    }
    setSelectedEtats(newSelected);
  };

  const isAllSelected = currentEtats.length > 0 && currentEtats.every(etat => selectedEtats.has(etat.id));

  const generateEtatHTML = (etat) => {
    const astreintesEtat = astreintesPayees.filter(ap => ap.Ref_Etat === etat.Ref);
    
    const groupedData = {};
    astreintesEtat.forEach(astreinte => {
      const key = astreinte.PrenomNom + '-' + astreinte.Statut + '-' + astreinte.Service;
      if (!groupedData[key]) {
        groupedData[key] = {
          prenomNom: astreinte.PrenomNom,
          statut: astreinte.Statut,
          service: astreinte.Service,
          count: 0,
          montantTotal: 0
        };
      }
      groupedData[key].count++;
      groupedData[key].montantTotal += astreinte.Montant || 0;
    });

    const groupedArray = Object.values(groupedData);
    const totalMontant = groupedArray.reduce((sum, item) => sum + item.montantTotal, 0);
    const totalCount = groupedArray.reduce((sum, item) => sum + item.count, 0);

    let htmlContent = '<!DOCTYPE html>';
    htmlContent += '<html lang="fr">';
    htmlContent += '<head>';
    htmlContent += '<meta charset="UTF-8">';
    htmlContent += '<title>' + etat.Nom + '</title>';
    htmlContent += '<style>';
    htmlContent += 'body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }';
    htmlContent += '.header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }';
    htmlContent += '.header-table td { padding: 10px; vertical-align: top; }';
    htmlContent += '.logo { max-height: 80px; max-width: 200px; }';
    htmlContent += '.title { text-align: center; font-size: 18px; font-weight: bold; padding: 20px 0; }';
    htmlContent += '.content-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }';
    htmlContent += '.content-table th, .content-table td { border: 1px solid #333; padding: 8px; text-align: left; }';
    htmlContent += '.content-table th { background-color: #f0f0f0; font-weight: bold; }';
    htmlContent += '.number { text-align: right; }';
    htmlContent += '.footer-table { width: 100%; border-collapse: collapse; margin-top: 30px; }';
    htmlContent += '.footer-table td { padding: 10px; vertical-align: top; }';
    htmlContent += '</style>';
    htmlContent += '</head>';
    htmlContent += '<body>';
    
    htmlContent += '<table class="header-table">';
    htmlContent += '<tr>';
    htmlContent += '<td style="width: 33%;"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Logo.ENVT.2018.png/330px-Logo.ENVT.2018.png" alt="Logo ENVT" class="logo"></td>';
    htmlContent += '<td style="width: 34%;"></td>';
    htmlContent += '<td style="width: 33%; text-align: right;"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Minist%C3%A8re_de_l%E2%80%99Agriculture_et_de_la_Souverainet%C3%A9_alimentaire.svg/640px-Minist%C3%A8re_de_l%E2%80%99Agriculture_et_de_la_Souverainet%C3%A9_alimentaire.svg.png" alt="Logo Ministere" class="logo"></td>';
    htmlContent += '</tr>';
    htmlContent += '<tr><td colspan="3" class="title">Astreintes - ' + etat.Nom + '</td></tr>';
    htmlContent += '</table>';
    
    htmlContent += '<table class="content-table">';
    htmlContent += '<thead>';
    htmlContent += '<tr><th>Nom et Prenom</th><th>Statut</th><th>Service</th><th>Nombre d\'astreintes</th><th>Montant total</th></tr>';
    htmlContent += '</thead>';
    htmlContent += '<tbody>';
    
    groupedArray.forEach(item => {
      htmlContent += '<tr>';
      htmlContent += '<td>' + item.prenomNom + '</td>';
      htmlContent += '<td>' + item.statut + '</td>';
      htmlContent += '<td>' + item.service + '</td>';
      htmlContent += '<td class="number">' + item.count + '</td>';
      htmlContent += '<td class="number">' + item.montantTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + '</td>';
      htmlContent += '</tr>';
    });
    
    htmlContent += '<tr style="font-weight: bold; background-color: #f0f0f0;">';
    htmlContent += '<td colspan="3">TOTAL</td>';
    htmlContent += '<td class="number">' + totalCount + '</td>';
    htmlContent += '<td class="number">' + totalMontant.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + '</td>';
    htmlContent += '</tr>';
    htmlContent += '</tbody>';
    htmlContent += '</table>';
    
    htmlContent += '<table class="footer-table">';
    htmlContent += '<tr>';
    htmlContent += '<td style="width: 33%;"><strong>Gestionnaire :</strong> ' + etat.Gestionnaire + '<br><strong>Edite le :</strong> ' + formatDateTime(etat.Date_Edition || Math.floor(Date.now() / 1000)) + '</td>';
    htmlContent += '<td style="width: 34%;"></td>';
    htmlContent += '<td style="width: 33%; text-align: center;"><strong>Direction</strong></td>';
    htmlContent += '</tr>';
    htmlContent += '</table>';
    htmlContent += '</body>';
    htmlContent += '</html>';

    return htmlContent;
  };

  const handleEditerEtats = async () => {
    if (selectedEtats.size === 0) {
      alert('Veuillez sélectionner au moins un état de paiement');
      return;
    }

    const message = 'Confirmer l\'édition de ' + selectedEtats.size + ' état' + (selectedEtats.size > 1 ? 's' : '') + ' de paiement ?';
    if (!confirm(message)) {
      return;
    }

    setProcessing(true);

    try {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      
      for (const etatId of selectedEtats) {
        await gristAPI.updateRecord('Astreintes_Etats', etatId, {
          Date_Edition: currentTimestamp
        });
      }

      for (const etatId of selectedEtats) {
        const etat = etats.find(e => e.id === etatId);
        if (etat) {
          const htmlContent = generateEtatHTML(etat);
          const blob = new Blob([htmlContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = etat.Nom.replace(/[^a-zA-Z0-9]/g, '_') + '.html';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }

      const successMessage = 'Édition réussie ! ' + selectedEtats.size + ' fichier' + (selectedEtats.size > 1 ? 's' : '') + ' HTML généré' + (selectedEtats.size > 1 ? 's' : '') + '.';
      alert(successMessage);
      
      setSelectedEtats(new Set());
      await loadData();

    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'édition: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📄</div>
        <div>Chargement de l'édition des astreintes...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{
        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '12px',
        textAlign: 'center',
        marginBottom: '30px'
      }}>
        <h1 style={{ 
          fontSize: '1.8rem', 
          marginBottom: '10px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '10px' 
        }}>
          📄 Edition des astreintes
        </h1>
        <p style={{ fontSize: '1.1rem', opacity: '0.9', margin: '0' }}>
          Édition et génération des états de paiement des astreintes
        </p>
      </div>

      {!isResponsable() && (
        <div style={{
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔒</div>
          <div style={{ color: '#92400e', fontSize: '16px', fontWeight: '600' }}>
            Seuls les responsables peuvent éditer les états de paiement
          </div>
        </div>
      )}

      {isResponsable() && (
        <>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            marginBottom: '30px'
          }}>
            <div style={{
              background: '#f8fafc',
              padding: '20px',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <h2 style={{ margin: '0', color: '#1f2937', fontSize: '20px' }}>
                États de paiement des astreintes ({etats.length} état{etats.length > 1 ? 's' : ''})
              </h2>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px'
              }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{
                      padding: '15px 20px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#475569',
                      borderBottom: '2px solid #e2e8f0',
                      width: '50px'
                    }}>
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ padding: '15px 20px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Nom</th>
                    <th style={{ padding: '15px 20px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Date création</th>
                    <th style={{ padding: '15px 20px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Support</th>
                    <th style={{ padding: '15px 20px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Gestionnaire</th>
                    <th style={{ padding: '15px 20px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Date édition</th>
                    <th style={{ padding: '15px 20px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Commentaire</th>
                  </tr>
                </thead>
                <tbody>
                  {currentEtats.map((etat, index) => (
                    <tr key={etat.id} style={{
                      background: selectedEtats.has(etat.id) ? '#f0f9ff' : (index % 2 === 0 ? 'white' : '#f8fafc'),
                      borderBottom: '1px solid #e2e8f0'
                    }}>
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0' }}>
                        <input
                          type="checkbox"
                          checked={selectedEtats.has(etat.id)}
                          onChange={(e) => handleSelectEtat(etat.id, e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ 
                        padding: '15px 20px', 
                        borderBottom: '1px solid #e2e8f0',
                        fontWeight: selectedEtats.has(etat.id) ? '600' : 'normal'
                      }}>
                        {etat.Nom}
                      </td>
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                        {formatDate(etat.Date_EtatPaiement)}
                      </td>
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0' }}>
                        <span style={{
                          background: etat.Support === 'ENVT' ? '#f3e8ff' : '#fef2f2',
                          color: etat.Support === 'ENVT' ? '#9333ea' : '#dc2626',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {etat.Support}
                        </span>
                      </td>
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0', color: '#374151' }}>
                        {etat.Gestionnaire}
                      </td>
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                        {etat.Date_Edition ? (
                          <span style={{
                            background: '#d1fae5',
                            color: '#059669',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            {formatDate(etat.Date_Edition)}
                          </span>
                        ) : (
                          <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                            Non édité
                          </span>
                        )}
                      </td>
                      <td style={{
                        padding: '15px 20px',
                        borderBottom: '1px solid #e2e8f0',
                        color: '#64748b',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {etat.Commentaire || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{
                padding: '20px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px'
              }}>
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: currentPage === 1 ? '#f9fafb' : 'white',
                    color: currentPage === 1 ? '#9ca3af' : '#374151',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ← Précédent
                </button>

                <span style={{ margin: '0 15px', color: '#374151' }}>
                  Page {currentPage} sur {totalPages}
                </span>

                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: currentPage === totalPages ? '#f9fafb' : 'white',
                    color: currentPage === totalPages ? '#9ca3af' : '#374151',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Suivant →
                </button>
              </div>
            )}
          </div>

          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <button
              onClick={handleEditerEtats}
              disabled={selectedEtats.size === 0 || processing}
              style={{
                background: (selectedEtats.size === 0 || processing) 
                  ? '#d1d5db' 
                  : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: (selectedEtats.size === 0 || processing) 
                  ? '#9ca3af' 
                  : 'white',
                border: 'none',
                padding: '15px 30px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: (selectedEtats.size === 0 || processing) 
                  ? 'not-allowed' 
                  : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                minWidth: '250px',
                margin: '0 auto'
              }}
            >
              {processing ? (
                <>
                  <span>⏳</span>
                  <span>Édition en cours...</span>
                </>
              ) : (
                <>
                  <span>📄</span>
                  <span>
                    Éditer les États sélectionnés
                    {selectedEtats.size > 0 && ' (' + selectedEtats.size + ')'}
                  </span>
                </>
              )}
            </button>
            
            {selectedEtats.size === 0 && (
              <div style={{
                marginTop: '15px',
                color: '#6b7280',
                fontSize: '14px',
                fontStyle: 'italic'
              }}>
                Sélectionnez au moins un état de paiement pour l'éditer
              </div>
            )}
          </div>
        </>
      )}

      <div style={{
        marginTop: '30px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px'
      }}>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', color: '#8b5cf6', fontWeight: 'bold', marginBottom: '5px' }}>
            {etats.length}
          </div>
          <div style={{ color: '#6b7280' }}>Total états</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', color: '#10b981', fontWeight: 'bold', marginBottom: '5px' }}>
            {etats.filter(e => e.Date_Edition).length}
          </div>
          <div style={{ color: '#6b7280' }}>États édités</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', color: '#f59e0b', fontWeight: 'bold', marginBottom: '5px' }}>
            {etats.filter(e => !e.Date_Edition).length}
          </div>
          <div style={{ color: '#6b7280' }}>Non édités</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', color: '#ef4444', fontWeight: 'bold', marginBottom: '5px' }}>
            {astreintesPayees.length}
          </div>
          <div style={{ color: '#6b7280' }}>Astreintes payées</div>
        </div>
      </div>
    </div>
  );
};