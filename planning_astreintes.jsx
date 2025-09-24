const Component = () => {
  const [astreintes, setAstreintes] = useState([]);
  const [services, setServices] = useState([]);
  const [personnels, setPersonnels] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('mois');
  const [selectedService, setSelectedService] = useState('tous');
  const [selectedServiceClinique, setSelectedServiceClinique] = useState('tous');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [formData, setFormData] = useState({ 
    service: '', 
    clinicienJour: '', 
    clinicienNuit: '', 
    date: '', 
    jour: false, 
    nuit: false,
    jourValidated: false,
    nuitValidated: false
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [astreintesData, servicesData, personnelsData, utilisateursData] = await Promise.all([
        gristAPI.getData('Astreintes'), 
        gristAPI.getData('Services'), 
        gristAPI.getData('Personnels'),
        gristAPI.getData('Utilisateurs')
      ]);
      setAstreintes(Array.isArray(astreintesData) ? astreintesData : []);
      setServices(Array.isArray(servicesData) ? servicesData : []);
      setPersonnels(Array.isArray(personnelsData) ? personnelsData : []);
      setUtilisateurs(Array.isArray(utilisateursData) ? utilisateursData : []);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      setAstreintes([]);
      setServices([]);
      setPersonnels([]);
      setUtilisateurs([]);
    } finally { 
      setLoading(false); 
    }
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR');
  
  const dateToTimestamp = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0);
    return Math.floor(date.getTime() / 1000);
  };

  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'année') newDate.setFullYear(newDate.getFullYear() - 1);
    else if (viewMode === 'mois') newDate.setMonth(newDate.getMonth() - 1);
    else if (viewMode === 'semaine') newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'année') newDate.setFullYear(newDate.getFullYear() + 1);
    else if (viewMode === 'mois') newDate.setMonth(newDate.getMonth() + 1);
    else if (viewMode === 'semaine') newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  const getAstreintesForDate = (date) => {
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
    const dateTimestamp = Math.floor(normalizedDate.getTime() / 1000);
    
    return astreintes.filter(a => {
      const astreinteFullDate = new Date(a.Date * 1000);
      const normalizedAstreinteDate = new Date(astreinteFullDate.getFullYear(), astreinteFullDate.getMonth(), astreinteFullDate.getDate(), 12, 0, 0);
      const astreinteTimestamp = Math.floor(normalizedAstreinteDate.getTime() / 1000);
      
      const diffInDays = Math.abs(dateTimestamp - astreinteTimestamp) / (24 * 60 * 60);
      return diffInDays < 1;
    });
  };

  const getServicesCliniques = () => {
    if (!services || services.length === 0) return [];
    
    const servicesCliniques = services
      .filter(service => service.gristHelper_Display2)
      .map(service => service.gristHelper_Display2)
      .filter((value, index, array) => array.indexOf(value) === index)
      .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
    
    return servicesCliniques;
  };

  const getAstreintesForCurrentView = () => {
    let filteredAstreintes = astreintes;
    
    if (selectedServiceClinique !== 'tous') {
      filteredAstreintes = filteredAstreintes.filter(astreinte => {
        const service = services.find(s => s.id === astreinte.Service);
        return service && service.gristHelper_Display2 === selectedServiceClinique;
      });
    }
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    if (viewMode === 'année') {
      filteredAstreintes = filteredAstreintes.filter(a => {
        const aDate = new Date(a.Date * 1000);
        return aDate.getFullYear() === year;
      });
    } else if (viewMode === 'mois') {
      filteredAstreintes = filteredAstreintes.filter(a => {
        const aDate = new Date(a.Date * 1000);
        return aDate.getFullYear() === year && aDate.getMonth() === month;
      });
    } else if (viewMode === 'semaine') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      
      filteredAstreintes = filteredAstreintes.filter(a => {
        const aDate = new Date(a.Date * 1000);
        return aDate >= startOfWeek && aDate <= endOfWeek;
      });
    }
    
    return filteredAstreintes;
  };

  const getFilteredAstreintes = (dateAstreintes) => {
    if (selectedServiceClinique === 'tous') return dateAstreintes;
    
    return dateAstreintes.filter(astreinte => {
      const service = services.find(s => s.id === astreinte.Service);
      return service && service.gristHelper_Display2 === selectedServiceClinique;
    });
  };
  
  const getPeriodTitle = () => {
    switch (viewMode) {
      case 'année':
        return `de l'année ${currentDate.getFullYear()}`;
      case 'mois':
        return `du mois de ${currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
      case 'semaine':
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        return `de la semaine du ${startOfWeek.getDate()} au ${endOfWeek.getDate()} ${endOfWeek.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
      default:
        return '';
    }
  };

  const getServiceName = (serviceId) => {
    const service = services.find(s => s.id === serviceId);
    return service ? service.Denomination : 'Service inconnu';
  };

  const getClinicienName = (clinicienId) => {
    const clinicien = personnels.find(p => p.id === clinicienId);
    return clinicien ? clinicien.Clinicien : 'Clinicien inconnu';
  };

  const getCliniciensByService = (serviceId) => {
    if (!serviceId) return [];
    
    const selectedService = services.find(s => s.id === parseInt(serviceId));
    if (!selectedService || !selectedService.ServiceClinique) return [];
    
    return personnels.filter(p => p.ServiceClinique === selectedService.ServiceClinique);
  };

  const isJourAstreinte = (astreinte) => astreinte.Type === '☀️ Jour';
  const isNuitAstreinte = (astreinte) => astreinte.Type === '🌙 Nuit';

  const isResponsable = () => {
    if (!utilisateurs || utilisateurs.length === 0) return false;
    const premierUtilisateur = utilisateurs[0];
    return premierUtilisateur.Responsable === true;
  };

  const getServicesAutorises = () => {
    if (!services || services.length === 0) {
      return [];
    }
    
    if (!utilisateurs || utilisateurs.length === 0) {
      return services;
    }
    
    const premierUtilisateur = utilisateurs[0];
    
    if (!premierUtilisateur.ServiceClinique || premierUtilisateur.ServiceClinique.trim() === '') {
      return services;
    }
    
    const serviceCliniqueRecherche = premierUtilisateur.ServiceClinique.trim();
    
    const servicesFilters = services.filter(service => {
      return service.gristHelper_Display2 === serviceCliniqueRecherche;
    });
    
    return servicesFilters;
  };

  const loadExistingAstreintes = (date, serviceId) => {
    if (!serviceId || serviceId === 'tous') {
      return { 
        clinicienJour: '', 
        clinicienNuit: '', 
        jour: false, 
        nuit: false,
        jourValidated: false,
        nuitValidated: false
      };
    }
    
    const servicesAutorises = getServicesAutorises();
    const serviceAutorise = servicesAutorises.find(s => s.id === parseInt(serviceId));
    
    if (!serviceAutorise) {
      return { 
        clinicienJour: '', 
        clinicienNuit: '', 
        jour: false, 
        nuit: false,
        jourValidated: false,
        nuitValidated: false
      };
    }
    
    const dayAstreintes = getAstreintesForDate(date);
    const serviceAstreintes = dayAstreintes.filter(a => a.Service === parseInt(serviceId));
    
    const jourAstreinte = serviceAstreintes.find(a => isJourAstreinte(a));
    const nuitAstreinte = serviceAstreintes.find(a => isNuitAstreinte(a));
    
    return {
      clinicienJour: jourAstreinte ? jourAstreinte.Clinicien.toString() : '',
      clinicienNuit: nuitAstreinte ? nuitAstreinte.Clinicien.toString() : '',
      jour: !!jourAstreinte,
      nuit: !!nuitAstreinte,
      jourValidated: jourAstreinte ? jourAstreinte.ValidationService === true : false,
      nuitValidated: nuitAstreinte ? nuitAstreinte.ValidationService === true : false
    };
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    const initialService = '';
    const existingData = loadExistingAstreintes(date, initialService);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    setFormData({ 
      service: initialService, 
      date: dateString, 
      ...existingData 
    });
    setShowAddModal(true);
  };

  const handleServiceChange = (newServiceId) => {
    const existingData = loadExistingAstreintes(selectedDate, newServiceId);
    setFormData(prev => ({ 
      ...prev, 
      service: newServiceId, 
      ...existingData 
    }));
  };

  const handleSaveAstreinte = async () => {
    if (!formData.service || (!formData.clinicienJour && !formData.clinicienNuit)) {
      alert('Veuillez sélectionner au moins un service et un clinicien');
      return;
    }

    try {
      const dateTimestamp = dateToTimestamp(formData.date);
      const dayAstreintes = getAstreintesForDate(selectedDate);
      const serviceAstreintes = dayAstreintes.filter(a => a.Service === parseInt(formData.service));
      
      const existingJour = serviceAstreintes.find(a => isJourAstreinte(a));
      if (formData.jour && formData.clinicienJour) {
        if (existingJour) {
          await gristAPI.updateRecord('Astreintes', existingJour.id, {
            Clinicien: parseInt(formData.clinicienJour)
          });
        } else {
          await gristAPI.addRecord('Astreintes', {
            Service: parseInt(formData.service),
            Clinicien: parseInt(formData.clinicienJour),
            Date: dateTimestamp,
            Type: '☀️ Jour'
          });
        }
      } else if (existingJour) {
        await gristAPI.deleteRecord('Astreintes', existingJour.id);
      }

      const existingNuit = serviceAstreintes.find(a => isNuitAstreinte(a));
      if (formData.nuit && formData.clinicienNuit) {
        if (existingNuit) {
          await gristAPI.updateRecord('Astreintes', existingNuit.id, {
            Clinicien: parseInt(formData.clinicienNuit)
          });
        } else {
          await gristAPI.addRecord('Astreintes', {
            Service: parseInt(formData.service),
            Clinicien: parseInt(formData.clinicienNuit),
            Date: dateTimestamp,
            Type: '🌙 Nuit'
          });
        }
      } else if (existingNuit) {
        await gristAPI.deleteRecord('Astreintes', existingNuit.id);
      }

      setShowAddModal(false);
      setFormData({ service: '', clinicienJour: '', clinicienNuit: '', date: '', jour: false, nuit: false, jourValidated: false, nuitValidated: false });
      await loadData();
    } catch (error) {
      alert('Erreur lors de la sauvegarde: ' + error.message);
    }
  };

  const handleDeleteAstreinte = async (astreinte) => {
    if (confirm('Supprimer cette astreinte ?')) {
      try { 
        await gristAPI.deleteRecord('Astreintes', astreinte.id); 
        await loadData(); 
      } catch (error) { 
        alert('Erreur lors de la suppression: ' + error.message); 
      }
    }
  };

  const renderYearView = () => {
    const year = currentDate.getFullYear(); 
    const months = [];
    
    for (let month = 0; month < 12; month++) {
      const monthDate = new Date(year, month, 1);
      const monthName = monthDate.toLocaleDateString('fr-FR', { month: 'long' });
      const monthAstreintes = astreintes.filter(a => {
        const aDate = new Date(a.Date * 1000);
        const matchesDate = aDate.getFullYear() === year && aDate.getMonth() === month;
        
        if (!matchesDate) return false;
        
        if (selectedServiceClinique === 'tous') return true;
        
        const service = services.find(s => s.id === a.Service);
        return service && service.gristHelper_Display2 === selectedServiceClinique;
      });
      
      months.push(
        <div 
          key={month} 
          onClick={() => { setCurrentDate(monthDate); setViewMode('mois'); }} 
          style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '8px', 
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)', 
            cursor: 'pointer', 
            transition: 'transform 0.2s, box-shadow 0.2s', 
            textAlign: 'center' 
          }} 
          onMouseEnter={(e) => { 
            e.currentTarget.style.transform = 'translateY(-2px)'; 
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)'; 
          }} 
          onMouseLeave={(e) => { 
            e.currentTarget.style.transform = 'translateY(0)'; 
            e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)'; 
          }}
        >
          <h3 style={{ margin: '0 0 10px 0', color: '#1f2937', textTransform: 'capitalize' }}>
            {monthName}
          </h3>
          <div style={{ fontSize: '24px', color: '#3b82f6', fontWeight: 'bold', marginBottom: '5px' }}>
            {monthAstreintes.length}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            astreinte{monthAstreintes.length > 1 ? 's' : ''}
          </div>
        </div>
      );
    }
    
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        {months}
      </div>
    );
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear(); 
    const month = currentDate.getMonth(); 
    const firstDay = new Date(year, month, 1); 
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay() + 1);
    
    const days = []; 
    const currentDay = new Date(startDate); 
    const dayHeaders = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    
    for (let week = 0; week < 6; week++) {
      for (let day = 0; day < 7; day++) {
        const dayDate = new Date(currentDay); 
        const isCurrentMonth = dayDate.getMonth() === month; 
        const isToday = dayDate.toDateString() === new Date().toDateString(); 
        const dayAstreintes = getFilteredAstreintes(getAstreintesForDate(dayDate));
        
        days.push(
          <div 
            key={`${week}-${day}`} 
            onClick={() => {
              if (isCurrentMonth) {
                setCurrentDate(dayDate);
                setViewMode('semaine');
              }
            }}
            style={{ 
              minHeight: '100px', 
              padding: '8px', 
              border: '1px solid #e5e7eb', 
              background: isCurrentMonth ? 'white' : '#f9fafb', 
              cursor: isCurrentMonth ? 'pointer' : 'default', 
              position: 'relative', 
              opacity: isCurrentMonth ? 1 : 0.5 
            }}
          >
            <div style={{ 
              fontWeight: isToday ? 'bold' : 'normal', 
              color: isToday ? '#3b82f6' : isCurrentMonth ? '#1f2937' : '#9ca3af', 
              marginBottom: '4px', 
              fontSize: '14px' 
            }}>
              {dayDate.getDate()}
            </div>
            {dayAstreintes.length > 0 && (
              <div style={{ fontSize: '10px' }}>
                {dayAstreintes.slice(0, 3).map((astreinte, index) => (
                  <div 
                    key={index} 
                    style={{ 
                      background: isJourAstreinte(astreinte) ? '#dbeafe' : '#e0f2fe', 
                      color: isJourAstreinte(astreinte) ? '#1e40af' : '#0c4a6e', 
                      padding: '2px 4px', 
                      borderRadius: '3px', 
                      marginBottom: '2px', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap' 
                    }} 
                    title={`${getServiceName(astreinte.Service)} - ${getClinicienName(astreinte.Clinicien)}`}
                  >
                    {isJourAstreinte(astreinte) ? '☀️' : '🌙'} {getServiceName(astreinte.Service).substring(0, 8)}...
                  </div>
                ))}
                {dayAstreintes.length > 3 && (
                  <div style={{ color: '#6b7280', fontSize: '9px' }}>
                    +{dayAstreintes.length - 3} autre{dayAstreintes.length - 3 > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )}
          </div>
        );
        
        currentDay.setDate(currentDay.getDate() + 1);
      }
    }
    
    return (
      <div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          background: '#f3f4f6', 
          border: '1px solid #e5e7eb' 
        }}>
          {dayHeaders.map(day => (
            <div 
              key={day} 
              style={{ 
                padding: '12px 8px', 
                textAlign: 'center', 
                fontWeight: '600', 
                fontSize: '14px', 
                color: '#374151' 
              }}
            >
              {day}
            </div>
          ))}
        </div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          background: 'white', 
          border: '1px solid #e5e7eb', 
          borderTop: 'none' 
        }}>
          {days}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate); 
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); 
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startOfWeek); 
      dayDate.setDate(dayDate.getDate() + i); 
      const isToday = dayDate.toDateString() === new Date().toDateString(); 
      const dayAstreintes = getFilteredAstreintes(getAstreintesForDate(dayDate));
      
      const sortedAstreintes = dayAstreintes.sort((a, b) => {
        const serviceA = getServiceName(a.Service);
        const serviceB = getServiceName(b.Service);
        
        const serviceCompare = serviceA.localeCompare(serviceB, 'fr', { sensitivity: 'base' });
        if (serviceCompare !== 0) return serviceCompare;
        
        const typeA = isJourAstreinte(a) ? 0 : 1;
        const typeB = isJourAstreinte(b) ? 0 : 1;
        return typeA - typeB;
      });
      
      days.push(
        <div key={i} style={{ flex: 1 }}>
          <div style={{ 
            padding: '15px', 
            background: '#f3f4f6', 
            textAlign: 'center', 
            borderBottom: '1px solid #e5e7eb', 
            fontWeight: isToday ? 'bold' : '500', 
            color: isToday ? '#3b82f6' : '#1f2937' 
          }}>
            <div style={{ fontSize: '12px', marginBottom: '2px' }}>
              {dayDate.toLocaleDateString('fr-FR', { weekday: 'short' })}
            </div>
            <div style={{ fontSize: '16px' }}>{dayDate.getDate()}</div>
          </div>
          <div style={{ padding: '15px', minHeight: '300px', background: 'white' }}>
            <button 
              onClick={() => handleDateClick(dayDate)} 
              style={{ 
                width: '100%', 
                padding: '8px', 
                background: '#f3f4f6', 
                border: '1px dashed #d1d5db', 
                borderRadius: '4px', 
                fontSize: '12px', 
                color: '#6b7280', 
                cursor: isResponsable() ? 'pointer' : 'default', 
                marginBottom: '10px',
                opacity: isResponsable() ? 1 : 0.6
              }}
              disabled={!isResponsable()}
            >
              {isResponsable() ? '✏️ Gérer astreinte' : '👁️ Consulter astreinte'}
            </button>
            {sortedAstreintes.map((astreinte, index) => {
              // Déterminer si l'astreinte est validée
              const isValidated = astreinte.ValidationService === true;
              
              return (
                <div 
                  key={index} 
                  style={{ 
                    background: isJourAstreinte(astreinte) ? '#dbeafe' : '#e0f2fe', 
                    padding: '8px', 
                    borderRadius: '6px', 
                    marginBottom: '8px', 
                    fontSize: '12px', 
                    position: 'relative',
                    // Ajouter une bordure verte pour les astreintes validées
                    border: isValidated ? '2px solid #10b981' : 'none',
                    // Réduire l'opacité pour les astreintes validées
                    opacity: isValidated ? 0.7 : 1
                  }}
                >
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                    {isJourAstreinte(astreinte) ? '☀️' : '🌙'} {getServiceName(astreinte.Service)}
                  </div>
                  <div style={{ color: '#6b7280', marginBottom: '4px' }}>
                    {getClinicienName(astreinte.Clinicien)}
                  </div>
                  {/* Modifier le bouton de suppression pour les astreintes validées */}
                  <button 
                    onClick={() => {
                      // Empêcher la suppression si l'astreinte est validée
                      if (isValidated) {
                        alert('Impossible de supprimer une astreinte validée');
                        return;
                      }
                      handleDeleteAstreinte(astreinte);
                    }} 
                    style={{ 
                      position: 'absolute', 
                      top: '4px', 
                      right: '4px', 
                      // Changer la couleur et le style pour les astreintes validées
                      background: isValidated ? '#d1d5db' : '#ef4444', 
                      color: isValidated ? '#6b7280' : 'white', 
                      border: 'none', 
                      borderRadius: '3px', 
                      padding: '2px 4px', 
                      fontSize: '10px', 
                      // Désactiver le curseur pour les astreintes validées
                      cursor: isValidated ? 'not-allowed' : (isResponsable() ? 'pointer' : 'default'),
                      // Ajuster l'opacité selon le statut
                      opacity: isValidated ? 0.5 : (isResponsable() ? 1 : 0.3),
                      display: isResponsable() ? 'block' : 'none'
                    }}
                    // Ajouter un title pour expliquer pourquoi le bouton est désactivé
                    title={isValidated ? 'Impossible de supprimer une astreinte validée' : 'Supprimer cette astreinte'}
                  >
                    {/* Changer l'icône pour les astreintes validées */}
                    {isValidated ? '🔒' : '❌'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    
    return (
      <div style={{ 
        display: 'flex', 
        background: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)', 
        overflow: 'hidden' 
      }}>
        {days}
      </div>
    );
  };

  const getCurrentViewTitle = () => {
    switch (viewMode) {
      case 'année':
        return currentDate.getFullYear();
      case 'mois':
        return currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      case 'semaine':
        const startOfWeek = new Date(currentDate); 
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); 
        const endOfWeek = new Date(startOfWeek); 
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        return `${startOfWeek.getDate()} - ${endOfWeek.getDate()} ${endOfWeek.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📅</div>
        <div>Chargement du calendrier des astreintes...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
        color: 'white',
        padding: '2px',
        borderRadius: '12px',
        textAlign: 'center',
        marginBottom: '10px'
      }}>
        <h1 style={{ 
          fontSize: '1.5rem', 
          marginBottom: '1px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '2px' 
        }}>
          📅 Calendrier des Astreintes
        </h1>
        <p style={{ fontSize: '1rem', opacity: '0.9' }}>
          Gestion prévisionnelle des astreintes par service
        </p>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={navigatePrevious} 
            style={{
              background: '#6b7280',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            ←
          </button>
          
          <button 
            onClick={goToToday} 
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Aujourd'hui
          </button>
          
          <button 
            onClick={navigateNext} 
            style={{
              background: '#6b7280',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            →
          </button>
          
          <h2 style={{ margin: '0 0 0 15px', color: '#1f2937', textTransform: 'capitalize' }}>
            {getCurrentViewTitle()}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <select
            value={selectedServiceClinique}
            onChange={(e) => setSelectedServiceClinique(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="tous">Tous les services cliniques</option>
            {getServicesCliniques().map(serviceClinique => (
              <option key={serviceClinique} value={serviceClinique}>
                {serviceClinique}
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: '6px', padding: '2px' }}>
            {['année', 'mois', 'semaine'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  background: viewMode === mode ? '#3b82f6' : 'transparent',
                  color: viewMode === mode ? 'white' : '#374151',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        {viewMode === 'année' && renderYearView()}
        {viewMode === 'mois' && renderMonthView()}
        {viewMode === 'semaine' && renderWeekView()}
      </div>

      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            minWidth: '500px',
            maxWidth: '90vw'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#1f2937' }}>
              {isResponsable() 
                ? ((formData.jour || formData.nuit) ? 'Modifier' : 'Nouvelle') + ' Astreinte'
                : 'Consultation Astreinte'
              } - {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long' })} {formatDate(selectedDate)}
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Service *
              </label>
              <select
                value={formData.service}
                onChange={(e) => handleServiceChange(e.target.value)}
                disabled={!isResponsable()}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: !isResponsable() ? '#f9fafb' : 'white',
                  cursor: isResponsable() ? 'pointer' : 'default'
                }}
              >
                <option value="">Sélectionner un service</option>
                {getServicesAutorises().map(service => (
                  <option key={service.id} value={service.id}>
                    {service.Denomination}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <input
                    type="checkbox"
                    checked={formData.jour}
                    onChange={(e) => setFormData({...formData, jour: e.target.checked})}
                    disabled={!isResponsable() || formData.jourValidated}
                    style={{ 
                      marginRight: '8px',
                      opacity: formData.jourValidated ? 0.5 : 1
                    }}
                  />
                  <span style={{ 
                    fontWeight: '500',
                    color: formData.jourValidated ? '#6b7280' : 'inherit'
                  }}>
                    ☀️ Astreinte de jour
                    {formData.jourValidated && (
                      <span style={{ 
                        color: '#10b981', 
                        marginLeft: '5px',
                        fontSize: '12px'
                      }}>
                        ✓ Validée
                      </span>
                    )}
                  </span>
                </label>
                {formData.jour && (
                  <select
                    value={formData.clinicienJour}
                    onChange={(e) => setFormData({...formData, clinicienJour: e.target.value})}
                    disabled={!isResponsable() || formData.jourValidated}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: (!isResponsable() || formData.jourValidated) ? '#f9fafb' : 'white',
                      cursor: (!isResponsable() || formData.jourValidated) ? 'default' : 'pointer',
                      opacity: formData.jourValidated ? 0.7 : 1
                    }}
                  >
                    <option value="">Sélectionner un clinicien</option>
                    {getCliniciensByService(formData.service).map(clinicien => (
                      <option key={clinicien.id} value={clinicien.id}>
                        {clinicien.Clinicien}
                      </option>
                    ))}
                  </select>
                )}
                {formData.jourValidated && (
                  <div style={{
                    marginTop: '5px',
                    padding: '8px',
                    backgroundColor: '#d1fae5',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#059669',
                    border: '1px solid #10b981'
                  }}>
                    🔒 astreinte non modifiable
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <input
                    type="checkbox"
                    checked={formData.nuit}
                    onChange={(e) => setFormData({...formData, nuit: e.target.checked})}
                    disabled={!isResponsable() || formData.nuitValidated}
                    style={{ 
                      marginRight: '8px',
                      opacity: formData.nuitValidated ? 0.5 : 1
                    }}
                  />
                  <span style={{ 
                    fontWeight: '500',
                    color: formData.nuitValidated ? '#6b7280' : 'inherit'
                  }}>
                    🌙 Astreinte de nuit
                    {formData.nuitValidated && (
                      <span style={{ 
                        color: '#10b981', 
                        marginLeft: '5px',
                        fontSize: '12px'
                      }}>
                        ✓ Validée
                      </span>
                    )}
                  </span>
                </label>
                {formData.nuit && (
                  <select
                    value={formData.clinicienNuit}
                    onChange={(e) => setFormData({...formData, clinicienNuit: e.target.value})}
                    disabled={!isResponsable() || formData.nuitValidated}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: (!isResponsable() || formData.nuitValidated) ? '#f9fafb' : 'white',
                      cursor: (!isResponsable() || formData.nuitValidated) ? 'default' : 'pointer',
                      opacity: formData.nuitValidated ? 0.7 : 1
                    }}
                  >
                    <option value="">Sélectionner un clinicien</option>
                    {getCliniciensByService(formData.service).map(clinicien => (
                      <option key={clinicien.id} value={clinicien.id}>
                        {clinicien.Clinicien}
                      </option>
                    ))}
                  </select>
                )}
                {formData.nuitValidated && (
                  <div style={{
                    marginTop: '5px',
                    padding: '8px',
                    backgroundColor: '#d1fae5',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#059669',
                    border: '1px solid #10b981'
                  }}>
                    🔒 astreinte non modifiable
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({ service: '', clinicienJour: '', clinicienNuit: '', date: '', jour: false, nuit: false, jourValidated: false, nuitValidated: false });
                }}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {isResponsable() ? 'Annuler' : 'Fermer'}
              </button>

              {isResponsable() && (
                <button
                  onClick={handleSaveAstreinte}
                  style={{
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Sauvegarder
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>Légende</h3>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '16px',
              height: '16px',
              background: '#dbeafe',
              borderRadius: '3px'
            }}></div>
            <span style={{ fontSize: '14px' }}>☀️ Astreinte de jour</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '16px',
              height: '16px',
              background: '#e0f2fe',
              borderRadius: '3px'
            }}></div>
            <span style={{ fontSize: '14px' }}>🌙 Astreinte de nuit</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '16px',
              height: '16px',
              background: '#dbeafe',
              borderRadius: '3px',
              border: '2px solid #10b981'
            }}></div>
            <span style={{ fontSize: '14px' }}>✓ Astreinte validée</span>
          </div>
        </div>
      </div>

      <div style={{
        marginTop: '30px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px'
      }}>
        <div style={{
          gridColumn: '1 / -1',
          textAlign: 'center',
          marginBottom: '10px'
        }}>
          <h3 style={{ color: '#1f2937', margin: '0' }}>
            Statistiques {getPeriodTitle()}
            {selectedServiceClinique !== 'tous' && 
              ` - ${selectedServiceClinique}`}
          </h3>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', color: '#3b82f6', fontWeight: 'bold', marginBottom: '5px' }}>
            {getAstreintesForCurrentView().length}
          </div>
          <div style={{ color: '#6b7280' }}>Total astreintes</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', color: '#10b981', fontWeight: 'bold', marginBottom: '5px' }}>
            {getAstreintesForCurrentView().filter(a => isJourAstreinte(a)).length}
          </div>
          <div style={{ color: '#6b7280' }}>Astreintes de jour</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', color: '#8b5cf6', fontWeight: 'bold', marginBottom: '5px' }}>
            {getAstreintesForCurrentView().filter(a => isNuitAstreinte(a)).length}
          </div>
          <div style={{ color: '#6b7280' }}>Astreintes de nuit</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', color: '#f59e0b', fontWeight: 'bold', marginBottom: '5px' }}>
            {selectedServiceClinique === 'tous' 
              ? new Set(getAstreintesForCurrentView().map(a => a.Service)).size
              : (getAstreintesForCurrentView().length > 0 ? services.filter(s => s.gristHelper_Display2 === selectedServiceClinique).length : 0)
            }
          </div>
          <div style={{ color: '#6b7280' }}>
            Service{(selectedServiceClinique === 'tous' ? new Set(getAstreintesForCurrentView().map(a => a.Service)).size : (getAstreintesForCurrentView().length > 0 ? services.filter(s => s.gristHelper_Display2 === selectedServiceClinique).length : 0)) > 1 ? 's' : ''} avec astreinte{(selectedServiceClinique === 'tous' ? new Set(getAstreintesForCurrentView().map(a => a.Service)).size : (getAstreintesForCurrentView().length > 0 ? services.filter(s => s.gristHelper_Display2 === selectedServiceClinique).length : 0)) > 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
};