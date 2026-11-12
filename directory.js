// Original directory retained; sample listings are not provider integrations.
const cityMap = {
  Uttarakhand: ['Dehradun · Bidholi','Dehradun · Prem Nagar','Dehradun · Rajpur Road','Haridwar','Rishikesh'],
  Haryana: ['Gurugram · DLF Phase 1','Gurugram · Sector 31','Gurugram · Sector 44','Gurugram · Sector 51','Gurugram · Sector 53','Faridabad'],
  Delhi: ['New Delhi · Saket','New Delhi · Dwarka','Delhi · Rohini','Delhi · Karol Bagh','New Delhi · Karol Bagh'],
  'Uttar Pradesh': ['Noida · Sector 18','Noida · Sector 62','Ghaziabad · Indirapuram','Lucknow · Gomti Nagar'],
  Maharashtra:['Mumbai · Bandra','Mumbai · Andheri','Pune · Kothrud'], Karnataka:['Bengaluru · Indiranagar','Bengaluru · Whitefield','Mysuru'],
  Rajasthan:['Jaipur · Malviya Nagar','Jaipur · Pratap Nagar'], Gujarat:['Ahmedabad · Navrangpura','Surat · Adajan'],
  'West Bengal':['Kolkata · Salt Lake'], 'Tamil Nadu':['Chennai · Anna Nagar'], Telangana:['Hyderabad · Banjara Hills'], Kerala:['Kochi · Kakkanad']
};
const directoryRows = [
  ['🏥','UPES Bidholi Medical Centre','General physician','Uttarakhand','Dehradun · Bidholi','Bidholi',false],
  ['🩺','D.I.M.S. Multi Speciality Hospital','General physician','Uttarakhand','Dehradun · Bidholi','Bidholi',false],
  ['🧪','Uttranchal University Hospital & Diagnostic Centre','Diagnostic lab','Uttarakhand','Dehradun · Bidholi','Kandhauli',false],
  ['💊','Swasthya Clinic & Diagnostics Centre','Diagnostic lab','Uttarakhand','Dehradun · Prem Nagar','Prem Nagar',false],
  ['🏥','Subharti Hospital & College','General physician','Uttarakhand','Dehradun · Prem Nagar','Prem Nagar',false],
  ['🏥','Artemis Hospital','General physician','Haryana','Gurugram · Sector 51','Sector 51',false],
  ['🏥','Alchemist Hospital','General physician','Haryana','Gurugram · Sector 53','Sector 53',false],
  ['🩺','Aggarwal Clinic','General physician','Haryana','Gurugram · Sector 31','Sector 31',false],
  ['❤️','Sir Ganga Ram Hospital','General physician','Delhi','New Delhi · Karol Bagh','Pusa Road',false],
  ['🏥','Indraprastha Apollo Hospital','General physician','Delhi','New Delhi · Saket','Sarita Vihar',false],
  ['🦷','Maulana Azad Institute of Dental Sciences','Dentist','Delhi','New Delhi · Karol Bagh','JLN Marg',false],
  ['🧒','Chacha Nehru Bal Chikitsalaya','Paediatrician','Delhi','Delhi · Karol Bagh','Geeta Colony',false],
  ['🐾','Paws & Care Veterinary Clinic','Pet clinic','Haryana','Gurugram · DLF Phase 1','DLF Phase 1',true],
  ['🐶','Happy Tails Pet Hospital','Pet clinic','Delhi','New Delhi · Saket','Saket',true],
  ['✂️','Urban Company Salon at Home','Salon','Haryana','Gurugram · DLF Phase 1','DLF Phase 1',true],
  ['💅','Urban Company Beauty at Home','Salon','Delhi','New Delhi · Saket','Saket',true],
  ['✨','Blush & Bloom Studio','Salon','Uttar Pradesh','Noida · Sector 18','Sector 18',true],
  ['🦷','Pearl Dental Studio','Dentist','Uttar Pradesh','Noida · Sector 18','Sector 18',true],
  ['🧪','CityCare Diagnostics','Diagnostic lab','Uttar Pradesh','Noida · Sector 18','Sector 18',true],
  ['🏠','HomeFix Services','Home service','Haryana','Gurugram · Sector 44','Sector 44',true],
  ['💆','The Wellness Room','Salon','Haryana','Gurugram · Sector 44','Sector 44',true],
  ['💇','Looks Salon','Salon','Delhi','New Delhi · Saket','Saket',false],
  ['💅','Nail Artistry Studio','Salon','Haryana','Gurugram · DLF Phase 1','DLF Phase 1',true],
  ['🐕','Dr. Vet Pet Clinic','Pet clinic','Uttarakhand','Dehradun · Rajpur Road','Rajpur Road',true],
  ['🧘','PhysioPlus Wellness','Physiotherapy','Delhi','New Delhi · Dwarka','Dwarka',true],
  ['👁️','VisionCare Eye Centre','Eye care','Haryana','Gurugram · Sector 51','Sector 51',true],
  ['💊','MediPoint Pharmacy','Pharmacy','Uttarakhand','Dehradun · Prem Nagar','Prem Nagar',true],
  ['🏛️','Citizen Service Centre','Government service','Delhi','Delhi · Rohini','Rohini',true],
  ['🧴','Urban Company Home Spa','Home service','Uttar Pradesh','Noida · Sector 62','Sector 62',true]
];
const providers = directoryRows.map((p,i)=>({id:'provider-'+i,icon:p[0],name:p[1],type:p[2],state:p[3],city:p[4],area:p[5],demo:p[6]}));
