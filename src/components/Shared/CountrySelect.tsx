import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface Country {
  code: string;
  name: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: 'AF', name: 'Afganistán', flag: '🇦🇫' },
  { code: 'AL', name: 'Albania', flag: '🇦🇱' },
  { code: 'DE', name: 'Alemania', flag: '🇩🇪' },
  { code: 'AD', name: 'Andorra', flag: '🇦🇩' },
  { code: 'AO', name: 'Angola', flag: '🇦🇴' },
  { code: 'AG', name: 'Antigua y Barbuda', flag: '🇦🇬' },
  { code: 'SA', name: 'Arabia Saudita', flag: '🇸🇦' },
  { code: 'DZ', name: 'Argelia', flag: '🇩🇿' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'AM', name: 'Armenia', flag: '🇦🇲' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'AZ', name: 'Azerbaiyán', flag: '🇦🇿' },
  { code: 'BS', name: 'Bahamas', flag: '🇧🇸' },
  { code: 'BD', name: 'Bangladés', flag: '🇧🇩' },
  { code: 'BB', name: 'Barbados', flag: '🇧🇧' },
  { code: 'BH', name: 'Baréin', flag: '🇧🇭' },
  { code: 'BE', name: 'Bélgica', flag: '🇧🇪' },
  { code: 'BZ', name: 'Belice', flag: '🇧🇿' },
  { code: 'BJ', name: 'Benín', flag: '🇧🇯' },
  { code: 'BY', name: 'Bielorrusia', flag: '🇧🇾' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴' },
  { code: 'BA', name: 'Bosnia y Herzegovina', flag: '🇧🇦' },
  { code: 'BW', name: 'Botsuana', flag: '🇧🇼' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
  { code: 'BN', name: 'Brunéi', flag: '🇧🇳' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫' },
  { code: 'BI', name: 'Burundi', flag: '🇧🇮' },
  { code: 'BT', name: 'Bután', flag: '🇧🇹' },
  { code: 'CV', name: 'Cabo Verde', flag: '🇨🇻' },
  { code: 'KH', name: 'Camboya', flag: '🇰🇭' },
  { code: 'CM', name: 'Camerún', flag: '🇨🇲' },
  { code: 'CA', name: 'Canadá', flag: '🇨🇦' },
  { code: 'TD', name: 'Chad', flag: '🇹🇩' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'CY', name: 'Chipre', flag: '🇨🇾' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'KM', name: 'Comoras', flag: '🇰🇲' },
  { code: 'CG', name: 'Congo', flag: '🇨🇬' },
  { code: 'KP', name: 'Corea del Norte', flag: '🇰🇵' },
  { code: 'KR', name: 'Corea del Sur', flag: '🇰🇷' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
  { code: 'CI', name: 'Costa de Marfil', flag: '🇨🇮' },
  { code: 'HR', name: 'Croacia', flag: '🇭🇷' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺' },
  { code: 'DK', name: 'Dinamarca', flag: '🇩🇰' },
  { code: 'DM', name: 'Dominica', flag: '🇩🇲' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
  { code: 'EG', name: 'Egipto', flag: '🇪🇬' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻' },
  { code: 'AE', name: 'Emiratos Árabes Unidos', flag: '🇦🇪' },
  { code: 'ER', name: 'Eritrea', flag: '🇪🇷' },
  { code: 'SK', name: 'Eslovaquia', flag: '🇸🇰' },
  { code: 'SI', name: 'Eslovenia', flag: '🇸🇮' },
  { code: 'ES', name: 'España', flag: '🇪🇸' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪' },
  { code: 'ET', name: 'Etiopía', flag: '🇪🇹' },
  { code: 'PH', name: 'Filipinas', flag: '🇵🇭' },
  { code: 'FI', name: 'Finlandia', flag: '🇫🇮' },
  { code: 'FJ', name: 'Fiyi', flag: '🇫🇯' },
  { code: 'FR', name: 'Francia', flag: '🇫🇷' },
  { code: 'GA', name: 'Gabón', flag: '🇬🇦' },
  { code: 'GM', name: 'Gambia', flag: '🇬🇲' },
  { code: 'GE', name: 'Georgia', flag: '🇬🇪' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'GR', name: 'Grecia', flag: '🇬🇷' },
  { code: 'GD', name: 'Granada', flag: '🇬🇩' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹' },
  { code: 'GN', name: 'Guinea', flag: '🇬🇳' },
  { code: 'GQ', name: 'Guinea Ecuatorial', flag: '🇬🇶' },
  { code: 'GW', name: 'Guinea-Bisáu', flag: '🇬🇼' },
  { code: 'GY', name: 'Guyana', flag: '🇬🇾' },
  { code: 'HT', name: 'Haití', flag: '🇭🇹' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳' },
  { code: 'HU', name: 'Hungría', flag: '🇭🇺' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'IQ', name: 'Irak', flag: '🇮🇶' },
  { code: 'IR', name: 'Irán', flag: '🇮🇷' },
  { code: 'IE', name: 'Irlanda', flag: '🇮🇪' },
  { code: 'IS', name: 'Islandia', flag: '🇮🇸' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' },
  { code: 'IT', name: 'Italia', flag: '🇮🇹' },
  { code: 'JM', name: 'Jamaica', flag: '🇯🇲' },
  { code: 'JP', name: 'Japón', flag: '🇯🇵' },
  { code: 'JO', name: 'Jordania', flag: '🇯🇴' },
  { code: 'KZ', name: 'Kazajistán', flag: '🇰🇿' },
  { code: 'KE', name: 'Kenia', flag: '🇰🇪' },
  { code: 'KG', name: 'Kirguistán', flag: '🇰🇬' },
  { code: 'KI', name: 'Kiribati', flag: '🇰🇮' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
  { code: 'LA', name: 'Laos', flag: '🇱🇦' },
  { code: 'LS', name: 'Lesoto', flag: '🇱🇸' },
  { code: 'LV', name: 'Letonia', flag: '🇱🇻' },
  { code: 'LB', name: 'Líbano', flag: '🇱🇧' },
  { code: 'LR', name: 'Liberia', flag: '🇱🇷' },
  { code: 'LY', name: 'Libia', flag: '🇱🇾' },
  { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮' },
  { code: 'LT', name: 'Lituania', flag: '🇱🇹' },
  { code: 'LU', name: 'Luxemburgo', flag: '🇱🇺' },
  { code: 'MK', name: 'Macedonia del Norte', flag: '🇲🇰' },
  { code: 'MG', name: 'Madagascar', flag: '🇲🇬' },
  { code: 'MY', name: 'Malasia', flag: '🇲🇾' },
  { code: 'MW', name: 'Malaui', flag: '🇲🇼' },
  { code: 'MV', name: 'Maldivas', flag: '🇲🇻' },
  { code: 'ML', name: 'Malí', flag: '🇲🇱' },
  { code: 'MT', name: 'Malta', flag: '🇲🇹' },
  { code: 'MA', name: 'Marruecos', flag: '🇲🇦' },
  { code: 'MU', name: 'Mauricio', flag: '🇲🇺' },
  { code: 'MR', name: 'Mauritania', flag: '🇲🇷' },
  { code: 'MX', name: 'México', flag: '🇲🇽' },
  { code: 'FM', name: 'Micronesia', flag: '🇫🇲' },
  { code: 'MD', name: 'Moldavia', flag: '🇲🇩' },
  { code: 'MC', name: 'Mónaco', flag: '🇲🇨' },
  { code: 'MN', name: 'Mongolia', flag: '🇲🇳' },
  { code: 'ME', name: 'Montenegro', flag: '🇲🇪' },
  { code: 'MZ', name: 'Mozambique', flag: '🇲🇿' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲' },
  { code: 'NA', name: 'Namibia', flag: '🇳🇦' },
  { code: 'NR', name: 'Nauru', flag: '🇳🇷' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮' },
  { code: 'NE', name: 'Níger', flag: '🇳🇪' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'NO', name: 'Noruega', flag: '🇳🇴' },
  { code: 'NZ', name: 'Nueva Zelanda', flag: '🇳🇿' },
  { code: 'OM', name: 'Omán', flag: '🇴🇲' },
  { code: 'NL', name: 'Países Bajos', flag: '🇳🇱' },
  { code: 'PK', name: 'Pakistán', flag: '🇵🇰' },
  { code: 'PW', name: 'Palaos', flag: '🇵🇼' },
  { code: 'PA', name: 'Panamá', flag: '🇵🇦' },
  { code: 'PG', name: 'Papúa Nueva Guinea', flag: '🇵🇬' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪' },
  { code: 'PL', name: 'Polonia', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'GB', name: 'Reino Unido', flag: '🇬🇧' },
  { code: 'CF', name: 'República Centroafricana', flag: '🇨🇫' },
  { code: 'CZ', name: 'República Checa', flag: '🇨🇿' },
  { code: 'CD', name: 'República Democrática del Congo', flag: '🇨🇩' },
  { code: 'DO', name: 'República Dominicana', flag: '🇩🇴' },
  { code: 'RO', name: 'Rumania', flag: '🇷🇴' },
  { code: 'RW', name: 'Ruanda', flag: '🇷🇼' },
  { code: 'RU', name: 'Rusia', flag: '🇷🇺' },
  { code: 'WS', name: 'Samoa', flag: '🇼🇸' },
  { code: 'KN', name: 'San Cristóbal y Nieves', flag: '🇰🇳' },
  { code: 'SM', name: 'San Marino', flag: '🇸🇲' },
  { code: 'VC', name: 'San Vicente y las Granadinas', flag: '🇻🇨' },
  { code: 'LC', name: 'Santa Lucía', flag: '🇱🇨' },
  { code: 'ST', name: 'Santo Tomé y Príncipe', flag: '🇸🇹' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳' },
  { code: 'RS', name: 'Serbia', flag: '🇷🇸' },
  { code: 'SC', name: 'Seychelles', flag: '🇸🇨' },
  { code: 'SL', name: 'Sierra Leona', flag: '🇸🇱' },
  { code: 'SG', name: 'Singapur', flag: '🇸🇬' },
  { code: 'SY', name: 'Siria', flag: '🇸🇾' },
  { code: 'SO', name: 'Somalia', flag: '🇸🇴' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'ZA', name: 'Sudáfrica', flag: '🇿🇦' },
  { code: 'SD', name: 'Sudán', flag: '🇸🇩' },
  { code: 'SS', name: 'Sudán del Sur', flag: '🇸🇸' },
  { code: 'SE', name: 'Suecia', flag: '🇸🇪' },
  { code: 'CH', name: 'Suiza', flag: '🇨🇭' },
  { code: 'SR', name: 'Surinam', flag: '🇸🇷' },
  { code: 'TH', name: 'Tailandia', flag: '🇹🇭' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'TJ', name: 'Tayikistán', flag: '🇹🇯' },
  { code: 'TL', name: 'Timor Oriental', flag: '🇹🇱' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬' },
  { code: 'TO', name: 'Tonga', flag: '🇹🇴' },
  { code: 'TT', name: 'Trinidad y Tobago', flag: '🇹🇹' },
  { code: 'TN', name: 'Túnez', flag: '🇹🇳' },
  { code: 'TM', name: 'Turkmenistán', flag: '🇹🇲' },
  { code: 'TR', name: 'Turquía', flag: '🇹🇷' },
  { code: 'TV', name: 'Tuvalu', flag: '🇹🇻' },
  { code: 'UA', name: 'Ucrania', flag: '🇺🇦' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'UZ', name: 'Uzbekistán', flag: '🇺🇿' },
  { code: 'VU', name: 'Vanuatu', flag: '🇻🇺' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'YE', name: 'Yemen', flag: '🇾🇪' },
  { code: 'DJ', name: 'Yibuti', flag: '🇩🇯' },
  { code: 'ZM', name: 'Zambia', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabue', flag: '🇿🇼' },
];

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
}

export function CountrySelect({
  value,
  onChange,
  label,
  required = false,
  placeholder = 'Buscar o seleccionar país...',
  error,
}: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCountry = COUNTRIES.find((c) => c.name === value);

  const filteredCountries = COUNTRIES.filter((country) =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (country: Country) => {
    onChange(country.name);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div
        className={`relative cursor-pointer ${
          error ? 'ring-2 ring-red-500' : ''
        }`}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
          }
        }}
      >
        <div
          className={`w-full px-4 py-2.5 rounded-lg border-2 transition-colors flex items-center justify-between ${
            isOpen
              ? 'border-blue-500 bg-white'
              : error
              ? 'border-red-300 bg-white hover:border-red-400'
              : 'border-slate-300 bg-white hover:border-slate-400'
          }`}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedCountry ? (
              <>
                <span className="text-2xl flex-shrink-0">{selectedCountry.flag}</span>
                <span className="text-slate-900 truncate">{selectedCountry.name}</span>
              </>
            ) : (
              <span className="text-slate-400">{placeholder}</span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {value && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <ChevronDown
              className={`w-5 h-5 text-slate-400 transition-transform ${
                isOpen ? 'transform rotate-180' : ''
              }`}
            />
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white border-2 border-blue-500 rounded-lg shadow-xl max-h-80 overflow-hidden">
            <div className="p-3 border-b border-slate-200 bg-slate-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Buscar país..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-64">
              {filteredCountries.length === 0 ? (
                <div className="p-4 text-center text-slate-500">
                  No se encontraron países
                </div>
              ) : (
                <div className="py-1">
                  {filteredCountries.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(country);
                      }}
                      className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left ${
                        value === country.name ? 'bg-blue-50 font-medium' : ''
                      }`}
                    >
                      <span className="text-2xl flex-shrink-0">{country.flag}</span>
                      <span className="text-slate-900 truncate">{country.name}</span>
                      {value === country.name && (
                        <span className="ml-auto text-blue-600 flex-shrink-0">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
