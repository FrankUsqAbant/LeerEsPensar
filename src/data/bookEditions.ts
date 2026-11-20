import type { BookIndexEntry } from '../types/folio';

export interface BookReadingSection {
  title: string;
  paragraphs: string[];
}

export interface BookEditionContent {
  bookId: string;
  editionNote: string;
  sections: BookReadingSection[];
  closingReflection: string;
}

const BOOK_EDITIONS: Record<string, BookEditionContent> = {
  'borges-ficciones': {
    bookId: 'borges-ficciones',
    editionNote:
      'Cuaderno de lectura comentada y pasajes esenciales preparados para descarga libre en LeerEsPensar.',
    sections: [
      {
        title: 'I. Umbral: Tlön, espejos y enciclopedias',
        paragraphs: [
          'Debo a la conjunción de un espejo y de una enciclopedia el descubrimiento de Uqbar. El espejo inquietaba el fondo de un corredor en una quinta de la calle Gaona, en Ramos Mejía; la enciclopedia falazmente se llama The Anglo-American Cyclopaedia y es una reimpresión literal, pero también morosa, de la Encyclopaedia Britannica de 1902.',
          'Bioy Casares recordó entonces que uno de los heresiarcas de Uqbar había declarado que los espejos y la cópula son abominables, porque multiplican el número de los hombres. Desde esa frase mínima, Borges abre una grieta en la realidad: basta una cita apócrifa en un volumen perdido para que un planeta entero comience a reescribir nuestra memoria.',
          'Leer Ficciones exige desacelerar la mirada. Cada nota al pie, cada fecha y cada título inventado funciona como una puerta lateral hacia una arquitectura filosófica disfrazada de reseña bibliográfica.',
        ],
      },
      {
        title: 'II. La Biblioteca de Babel y el vértigo del orden',
        paragraphs: [
          'El universo (que otros llaman la Biblioteca) se compone de un número indefinido, y tal vez infinito, de galerías hexagonales. En esa simetría interminable conviven todas las combinaciones posibles de veinticinco símbolos ortográficos: la historia minuciosa del porvenir, el catálogo fiel de la Biblioteca y miles de catálogos falsos.',
          'La paradoja del relato no es la falta de sentido, sino su exceso absoluto. Cuando todo libro concebible existe en algún anaquel remoto, buscar una verdad verificable se vuelve un acto de fe y paciencia.',
        ],
      },
      {
        title: 'III. Senderos que se bifurcan en el tiempo',
        paragraphs: [
          'A diferencia de Newton o Schopenhauer, Ts’ui Pên no creía en un tiempo uniforme y absoluto. Creía en infinitas series de tiempos, en una red creciente y vertiginosa de tiempos divergentes, convergentes y paralelos.',
          'Esa trama de posibilidades que se abrazan, se ignoran o se bifurcan convierte la lectura en un ejercicio activo: cada decisión del lector deja resonando las versiones no elegidas de la historia.',
        ],
      },
    ],
    closingReflection:
      'Quien cierra Ficciones descubre que los libros no reflejan el mundo: lo multiplican y lo interrogan.',
  },
  'woolf-habitacion-propia': {
    bookId: 'woolf-habitacion-propia',
    editionNote:
      'Edición de estudio abierta sobre ensayo moderno, creación y autonomía intelectual para lectura y descarga en PDF.',
    sections: [
      {
        title: 'I. A orillas del río y la pregunta inicial',
        paragraphs: [
          'Pero, dirán ustedes, le hemos pedido que nos hable de las mujeres y la novela —¿qué tiene eso que ver con una habitación propia? Intentaré explicarme. Cuando me pidieron que hablara de las mujeres y la novela, me senté a orillas de un río a pensar qué significaban esas palabras.',
          'Virginia Woolf no responde desde un tratado rígido, sino desde la experiencia viva del paseo, la interrupción en el césped universitario y la visita a las bibliotecas donde la historia se escribió con silencios.',
          'Su argumento central es tan concreto como revolucionario: la libertad intelectual depende de cosas materiales, y la poesía depende de la libertad intelectual.',
        ],
      },
      {
        title: 'II. La hermana imaginaria de Shakespeare',
        paragraphs: [
          'Imaginemos qué habría sucedido si William Shakespeare hubiese tenido una hermana maravillosamente dotada, llamada Judith. Mientras él recorría los caminos hacia Londres y encontraba escenario para su genio, a ella se le cerraban los estudios, los viajes y hasta la quietud de un cuarto sin interrupciones.',
          'Con esa parábola luminosa, Woolf demuestra que el talento no nace en el vacío: necesita tiempo protegido, ingresos modestos, interlocución y derecho al error.',
        ],
      },
      {
        title: 'III. La mente andrógina y el porvenir',
        paragraphs: [
          'Cuando una escritura logra desprenderse del rencor y de la defensa constante, alcanza una lucidez serena donde todo detalle cotidiano —una mesa, una ventana, una tarde gris— resplandece con verdad propia.',
          'Por eso el llamado final del ensayo sigue intacto hoy: ganar espacio propio para leer, observar la realidad sin intermediarios y atreverse a pensar en voz propia.',
        ],
      },
    ],
    closingReflection:
      'Una habitación con pestillo es también una metáfora de la atención sin ruido para crear y pensar.',
  },
  'cortazar-bestiario': {
    bookId: 'cortazar-bestiario',
    editionNote:
      'Selección comentada y pasajes de apertura de los relatos fantásticos de Julio Cortázar en edición descargable.',
    sections: [
      {
        title: 'I. Casa tomada y el avance de lo invisible',
        paragraphs: [
          'Nos gustaba la casa porque aparte de espaciosa y antigua (hoy que las casas antiguas sucumben a la más ventajosa liquidación de sus materiales) guardaba los recuerdos de nuestros bisabuelos, el abuelo paterno, nuestros padres y toda la infancia.',
          'Irene y el narrador habitan ese silencio ordenado hasta que un sonido sordo e impreciso obliga a cerrar la puerta de roble del pasillo. Nadie discute la invasión; simplemente retroceden hacia el lado del zaguán.',
          'Lo inquietante en Cortázar es la naturalidad con que lo inexplicable se vuelve hábito doméstico.',
        ],
      },
      {
        title: 'II. Carta a una señorita en París',
        paragraphs: [
          'Andrée, yo no quería venirme a vivir a su departamento de la calle Suipacha. No tanto por los conejitos, sino porque me duele ingresar en un orden cerrado, construido por alguien más hasta en la colocación exacta de cada libro y cada taza.',
          'Cuando la ansiedad rompe ese equilibrio, los conejitos blancos aparecen como símbolo tierno y desesperado de aquello que no cabe en las normas del mundo adulto.',
        ],
      },
      {
        title: 'III. El ritmo como puente hacia lo insólito',
        paragraphs: [
          'En Bestiario, cada frase conserva la respiración del habla cotidiana. Precisamente porque reconocemos las calles, el mate, el verano lento y las conversaciones familiares, el giro fantástico nos toma sin defensas.',
        ],
      },
    ],
    closingReflection:
      'Lo fantástico no vive en castillos lejanos: respira detrás de cualquier puerta cotidiana.',
  },
  'camus-extranjero': {
    bookId: 'camus-extranjero',
    editionNote:
      'Guía editorial y pasajes clave para leer y conservar en PDF la novela solar de Albert Camus.',
    sections: [
      {
        title: 'I. El telegrama y la claridad seca del presente',
        paragraphs: [
          'Hoy ha muerto mamá. O quizá ayer. No lo sé. Recibí un telegrama del asilo: «Falleció su madre. Entierro mañana. Sentidas condolencias». Pero no quiere decir nada. Quizá haya sido ayer.',
          'Desde la primera línea, Meursault habla sin adornos ni excusas. No interpreta el mundo para agradar a quienes lo rodean; registra el calor de la luz, el sabor del café con leche, el cansancio del cuerpo.',
          'Esa economía radical desnuda la distancia entre lo que una persona siente en verdad y la coreografía emocional que la sociedad exige.',
        ],
      },
      {
        title: 'II. El sol de Argel y el tribunal de las apariencias',
        paragraphs: [
          'En la segunda parte del relato, el tribunal juzga mucho más el gesto impasible de Meursault en el velorio que los hechos mismos. Quien no representa la tristeza esperada se vuelve sospechoso ante la multitud.',
          'Camus construye así una defensa punzante de la honestidad interior frente a los discursos prefabricados.',
        ],
      },
      {
        title: 'III. Despertar bajo las estrellas',
        paragraphs: [
          'En la celda nocturna, frente a la indiferencia serena del cielo estrellado, Meursault comprende que el único vínculo real con la vida es vivirla con plenitud consciente, sin mentirse ni pedir consuelos falsos.',
        ],
      },
    ],
    closingReflection:
      'Aceptar la lucidez del instante presente transforma el silencio del mundo en libertad.',
  },
  'lispector-hora-estrella': {
    bookId: 'lispector-hora-estrella',
    editionNote:
      'Cuaderno íntimo de lectura y descarga segura en PDF dedicado a la última novela de Clarice Lispector.',
    sections: [
      {
        title: 'I. El comienzo con un sí',
        paragraphs: [
          'Todo en el mundo comenzó con un sí. Una molécula dijo sí a otra molécula y nació la vida. Pero antes de la prehistoria había la prehistoria de la prehistoria y había el nunca y había el sí.',
          'Rodrigo S.M., el narrador que duda a cada instante de su oficio, se detiene para contar la historia de Macabéa: una joven del nordeste que trabaja como mecanógrafa en Río de Janeiro y apenas ocupa espacio en la ciudad.',
          'Escribir sobre alguien casi invisible obliga al lenguaje a volverse humilde, tembloroso y exacto.',
        ],
      },
      {
        title: 'II. Macabéa y la radio de la hora exacta',
        paragraphs: [
          'Macabéa no sabe formular grandes preguntas, pero colecciona datos curiosos que escucha en la radio mientras toma café frío. En esa fragilidad sin rencor late una dignidad inmensa.',
          'Lispector revela que debajo de las vidas aparentemente mínimas circula el mismo misterio filosófico que mueve las estrellas.',
        ],
      },
      {
        title: 'III. La hora de la estrella',
        paragraphs: [
          'En el instante final, cuando Macabéa queda tendida frente a la calle húmeda, su historia pequeña se vuelve inmensa: la literatura le devuelve el brillo que el mundo le negó en vida.',
        ],
      },
    ],
    closingReflection:
      'Pocas novelas logran mirar la vulnerabilidad humana con tanta lucidez y ternura al mismo tiempo.',
  },
  'pizarnik-arbol-de-diana': {
    bookId: 'pizarnik-arbol-de-diana',
    editionNote:
      'Edición poética breve de lectura contemplativa y conservación en PDF en LeerEsPensar.',
    sections: [
      {
        title: 'I. El salto al alba',
        paragraphs: [
          'He dado el salto de mí al alba. He dejado mi cuerpo junto a la luz y he cantado la tristeza de lo que nace.',
          'En Árbol de Diana, cada poema parece tallado en silencio. Alejandra Pizarnik reduce el verso a tres o cuatro líneas incandescentes donde el blanco de la página respira tanto como las palabras.',
          'El libro debe leerse sin prisa, dejando una pausa verdadera entre un fragmento y el siguiente.',
        ],
      },
      {
        title: 'II. Vigilia, jardín y memoria',
        paragraphs: [
          'Las imágenes recurrentes —la niña frente al espejo, los pájaros nocturnos, el jardín cerrado, la palabra que no alcanza a nombrar— componen un autorretrato hecho de destellos.',
          'No hay ornamento superfluo: cada sustantivo carga el peso exacto de una vigilia entera.',
        ],
      },
      {
        title: 'III. El eco después del silencio',
        paragraphs: [
          'Al terminar estos treinta y ocho poemas breves, lo que permanece no es una anécdota, sino una afinación distinta del oído para escuchar lo que calla el lenguaje cotidiano.',
        ],
      },
    ],
    closingReflection:
      'En la brevedad precisa cabe un universo entero cuando la palabra está dicha desde la verdad.',
  },
  'rulfo-pedro-paramo': {
    bookId: 'rulfo-pedro-paramo',
    editionNote:
      'Edición de lectura coral y descarga PDF para recorrer los murmullos de Comala.',
    sections: [
      {
        title: 'I. El descenso hacia Comala',
        paragraphs: [
          'Vine a Comala porque me dijeron que acá vivía mi padre, un tal Pedro Páramo. Mi madre me lo dijo. Y yo le prometí que vendría a verlo en cuanto ella muriera.',
          'Juan Preciado desciende por un camino polvoriento y cálido donde el tiempo parece haberse detenido en la reverberación de la tarde. Cada encuentro en las esquinas desiertas va borrando la frontera entre los vivos y los que recuerdan.',
          'Rulfo no explica ni subraya: deja que las voces hablen desde las grietas del adobe.',
        ],
      },
      {
        title: 'II. Fragmentos de lluvia, deseo y poder',
        paragraphs: [
          'A través de escenas breves que saltan en el tiempo, conocemos a Pedro Páramo desde niño hasta convertirse en cacique implacable de la Media Luna, incapaz sin embargo de poseer el mundo interior de Susana San Juan.',
          'La novela enseña al lector a armar el mosaico escuchando el tono de cada murmullo.',
        ],
      },
      {
        title: 'III. El desmoronamiento como un montón de piedras',
        paragraphs: [
          'Con una economía verbal insuperable, Comala queda grabada en la memoria como un territorio mítico donde el calor, la culpa y el amor sobreviven en forma de eco.',
        ],
      },
    ],
    closingReflection:
      'Cada relectura de Pedro Páramo revela un matiz nuevo oculto en su silencio.',
  },
  'garcia-marquez-coronel': {
    bookId: 'garcia-marquez-coronel',
    editionNote:
      'Edición comentada de lectura rápida y descarga verificada en PDF de la novela corta de García Márquez.',
    sections: [
      {
        title: 'I. El tarro del café y la espera de los viernes',
        paragraphs: [
          'El coronel destapó el tarro del café y comprobó que no había más de una cucharadita. Retiró la olla del fogón, vertió la mitad del agua en el piso de tierra y con un cuchillo raspó el interior del tarro.',
          'Desde las primeras frases, la escasez se muestra con pudor y dignidad. Cada viernes, el coronel se viste con su traje de paño oscuro y camina hasta el muelle esperando la carta de pensión que lleva quince años sin llegar.',
          'En esa casa con techo de zinc, la esperanza no es ingenuidad: es una forma terca de resistencia.',
        ],
      },
      {
        title: 'II. El gallo y la memoria del hijo',
        paragraphs: [
          'La única herencia tangible del hijo ausente es un gallo de pelea al que el pueblo entero apuesta su ilusión de revancha. Venderlo resolvería el hambre inmediata; conservarlo sostiene el orgullo compartido.',
          'Entre diálogos cortantes, humor seco y ternura conyugal, la novela alcanza una tensión moral inolvidable.',
        ],
      },
      {
        title: 'III. La última palabra',
        paragraphs: [
          'Cuando su esposa pregunta qué van a comer entretanto, el coronel necesita setenta y cinco años —todos los años de su vida, minuto a minuto— para llegar a ese instante y pronunciar una sola palabra limpia, pura y definitiva.',
        ],
      },
    ],
    closingReflection:
      'La dignidad austera brilla más fuerte cuando todo alrededor invita a rendirse.',
  },
  'kafka-metamorfosis': {
    bookId: 'kafka-metamorfosis',
    editionNote:
      'Edición de lectura comentada y descarga verificada en PDF integrada desde la curaduría abierta de LeerEsPensar.',
    sections: [
      {
        title: 'I. El despertar de Gregorio Samsa',
        paragraphs: [
          'Cuando Gregorio Samsa se despertó una mañana después de un sueño intranquilo, se encontró sobre su cama convertido en un monstruoso insecto. Estaba echado sobre su duro caparazón y, al alzar un poco la cabeza, vio su vientre abombado y pardo dividido por arcos rígidos.',
          'Lo verdaderamente perturbador del comienzo no es el prodigio biológico, sino la calma resignada con que Gregorio intenta seguir pensando en sus horarios de viajante de comercio y en las facturas de la casa.',
        ],
      },
      {
        title: 'II. La puerta cerrada y el orden familiar',
        paragraphs: [
          'A medida que pasan los días detrás de la puerta cerrada, el hogar que dependía del salario de Gregorio aprende a reorganizarse sin él. El afecto se vuelve cansancio, y el cuarto silencioso se convierte en depósito de objetos sobrantes.',
        ],
      },
      {
        title: 'III. El sonido del violín y la lucidez final',
        paragraphs: [
          'Cuando su hermana Grete toca el violín en la sala, Gregorio siente por última vez la llamada de algo que ni el cuerpo transformado ni el rechazo doméstico lograron destruir: la necesidad de belleza y escucha.',
        ],
      },
    ],
    closingReflection:
      'La transformación más dura del relato no ocurre en el cuerpo de Gregorio, sino en la mirada de quienes dejan de reconocerlo.',
  },
  'wilde-dorian-gray': {
    bookId: 'wilde-dorian-gray',
    editionNote:
      'Edición literaria libre preparada para lectura inmersiva y descarga PDF verificada en LeerEsPensar.',
    sections: [
      {
        title: 'I. El estudio de Basil Hallward',
        paragraphs: [
          'El estudio estaba impregnado del intenso aroma de las rosas, y cuando la ligera brisa estival agitaba los árboles del jardín entraba por la puerta abierta el pesado perfume de las lilas y de los espinos en flor.',
          'Ante el lienzo recién terminado, las palabras brillantes y cínicas de lord Henry Wotton despiertan en el joven Dorian Gray el terror de envejecer y la plegaria imprudente de intercambiar su alma por la juventud perpetua.',
        ],
      },
      {
        title: 'II. El cuadro oculto tras la cortina',
        paragraphs: [
          'Mientras Dorian recorre salones, teatros y placeres sin que el tiempo deje una sola arruga en su rostro, el retrato guardado en el viejo cuarto de estudios acumula cada sombra moral de sus actos.',
        ],
      },
      {
        title: 'III. El espejo de la conciencia',
        paragraphs: [
          'Wilde convierte la fábula gótica en una pregunta incómoda sobre el arte y la vida: ningún hechizo estético puede silenciar indefinidamente la memoria de lo que uno elige destruir.',
        ],
      },
    ],
    closingReflection:
      'El retrato nunca fue un adorno en la pared: era la única verdad que Dorian no pudo maquillar.',
  },
  'shelley-frankenstein': {
    bookId: 'shelley-frankenstein',
    editionNote:
      'Edición comentada para lectura y descarga segura en PDF de la obra fundacional de Mary Shelley.',
    sections: [
      {
        title: 'I. Cartas desde el hielo del Ártico',
        paragraphs: [
          'Te alegrará saber que ningún desastre ha acompañado el comienzo de una empresa que tú consideraste con tan mal presagio. Desde el buque atrapado entre témpanos blancos, el capitán Walton recoge a un hombre exhausto llamado Víctor Frankenstein.',
          'El relato avanza como cajas chinas de voces: la ambición del científico por vencer a la muerte choca de frente con el pavor que siente en el segundo exacto en que su criatura abre los ojos.',
        ],
      },
      {
        title: 'II. La educación solitaria de la criatura',
        paragraphs: [
          'Abandonada por su creador, la criatura aprende el lenguaje escuchando en secreto a una familia campesina y leyendo en el bosque libros encontrados por azar. Su tragedia nace de comprender el amor humano sin recibir jamás un gesto sin miedo.',
        ],
      },
      {
        title: 'III. Prometeo ante su espejo',
        paragraphs: [
          'En las cumbres heladas de Ginebra y en el desierto polar, creador y criatura quedan atados por una pregunta vigente dos siglos después: qué debemos a aquello a lo que damos existencia.',
        ],
      },
    ],
    closingReflection:
      'Ningún avance técnico absuelve al creador de la compasión y el cuidado hacia su obra.',
  },
  'austen-orgullo-y-prejuicio': {
    bookId: 'austen-orgullo-y-prejuicio',
    editionNote:
      'Edición abierta de lectura fluida y descarga en PDF verificada para la colección clásica.',
    sections: [
      {
        title: 'I. Bailes de provincia y primeras impresiones',
        paragraphs: [
          'Es una verdad mundialmente reconocida que un hombre soltero, poseedor de una gran fortuna, necesita una esposa. Con esa ironía impecable, Jane Austen abre el telón sobre la casa de los Bennet en Longbourn.',
          'Elizabeth observa las convenciones con lucidez y sentido del humor, decidida a no confundir la cortesía interesada ni la riqueza heredada con el verdadero carácter.',
        ],
      },
      {
        title: 'II. La carta de Darcy y el giro de la mirada',
        paragraphs: [
          'El corazón intelectual de la novela late cuando Elizabeth lee y relee la carta extensa de Fitzwilliam Darcy: por primera vez reconoce cómo su propio orgullo al juzgar de oído la volvió ciega ante los hechos.',
        ],
      },
      {
        title: 'III. Inteligencia compartida en Pemberley',
        paragraphs: [
          'Austen demuestra que el afecto duradero no nace de la idealización rápida, sino del respeto mutuo entre dos mentes capaces de corregirse y reírse juntas.',
        ],
      },
    ],
    closingReflection:
      'Mirar por segunda vez, sin la prisa del prejuicio, sigue siendo el mayor gesto de inteligencia afectiva.',
  },
  'doyle-estudio-en-escarlata': {
    bookId: 'doyle-estudio-en-escarlata',
    editionNote:
      'Edición policial libre preparada para lectura y descarga verificada en LeerEsPensar.',
    sections: [
      {
        title: 'I. Encuentro en el 221B de Baker Street',
        paragraphs: [
          'En el año 1878 me licencié en Medicina por la Universidad de Londres y, tras sobrevivir a la campaña de Afganistán, regresé sin salud ni destino claro buscando un alojamiento modesto.',
          'Al conocer a Sherlock Holmes en el laboratorio del hospital de San Bartolomé, Watson descubre un método fascinante: leer la profesión, los viajes y las dudas de una persona en la geometría diminuta de sus hábitos.',
        ],
      },
      {
        title: 'II. La palabra escrita en la pared de Lauriston Gardens',
        paragraphs: [
          'Sin signos de lucha ni heridas visibles, el enigma de la habitación vacía desafía a Scotland Yard hasta que la lupa de Holmes reconstruye cada paso silencioso dado bajo la lluvia nocturna de Londres.',
        ],
      },
      {
        title: 'III. El hilo escarlata del pasado',
        paragraphs: [
          'Detrás de cada crimen lógico late siempre una historia humana de promesas rotas y memoria obstinada que solo la paciencia de observar sin suposiciones logra descifrar.',
        ],
      },
    ],
    closingReflection:
      'Ver y observar no son sinónimos: la diferencia está en la atención disciplinada al detalle.',
  },
  'carroll-alicia-maravillas': {
    bookId: 'carroll-alicia-maravillas',
    editionNote:
      'Edición abierta para leer sin prisa y conservar en PDF verificado desde LeerEsPensar.',
    sections: [
      {
        title: 'I. Por la madriguera del Conejo Blanco',
        paragraphs: [
          'Alicia empezaba a cansarse de estar sentada junto a su hermana a la orilla del río sin tener nada que hacer, cuando pasó corriendo muy cerca un Conejo Blanco de ojos rosados consultando un reloj de chaleco.',
          'Al caer por el túnel tapizado de estanterías de libros y frascos vacíos, las leyes cotidianas del tamaño, el tiempo y el sentido común empiezan a bailar con libertad absoluta.',
        ],
      },
      {
        title: 'II. Una merienda de locos sin fin',
        paragraphs: [
          'En la mesa larga del Sombrerero y la Liebre de Marzo siempre son las seis de la tarde. Carroll convierte los diálogos infantiles en brillantes paradojas sobre el lenguaje literal y las normas arbitrarias.',
        ],
      },
      {
        title: 'III. Despertar frente al tribunal de naipes',
        paragraphs: [
          'Cuando Alicia alza la voz ante la Reina de Corazones recordando que todos son apenas una baraja de cartas, la imaginación prueba su fuerza liberadora contra el miedo.',
        ],
      },
    ],
    closingReflection:
      'Hacer preguntas absurdas suele ser la manera más lúcida de cuestionar reglas absurdas.',
  },
  'cervantes-don-quijote': {
    bookId: 'cervantes-don-quijote',
    editionNote:
      'Selección esencial y comentada preparada en homenaje a la tradición hispánica de lectura abierta.',
    sections: [
      {
        title: 'I. En un lugar de la Mancha',
        paragraphs: [
          'En un lugar de la Mancha, de cuyo nombre no quiero acordarme, no ha mucho tiempo que vivía un hidalgo de los de lanza en astillero, adarga antigua, rocín flaco y galgo corredor.',
          'De tanto leer de claro en claro y de turbio en turbio, Alonso Quijano decide salir a los caminos reales convencido de que la palabra escrita puede obligar al mundo a volverse más noble.',
        ],
      },
      {
        title: 'II. Molinos de viento y diálogos en el camino',
        paragraphs: [
          'A medida que cabalgan por la llanura, don Quijote y Sancho Panza dejan de ser opuestos caricaturescos: el caballero aprende a escuchar la tierra y el escudero se contagia de la generosidad del sueño.',
        ],
      },
      {
        title: 'III. La libertad como el más preciado bien',
        paragraphs: [
          '«La libertad, Sancho, es uno de los más preciosos dones que a los hombres dieron los cielos»: cuatro siglos después, la conversación entre ambos sigue siendo la escuela viva de nuestra lengua.',
        ],
      },
    ],
    closingReflection:
      'Quien lee el Quijote aprende a reír con ternura sin renunciar nunca al deseo de justicia.',
  },
  'melville-moby-dick': {
    bookId: 'melville-moby-dick',
    editionNote:
      'Edición abierta de lectura y descarga verificada en PDF de la epopeya marítima de Herman Melville.',
    sections: [
      {
        title: 'I. Llamadme Ismael',
        paragraphs: [
          'Llamadme Ismael. Hace unos años —no importa exactamente cuántos—, teniendo poco o ningún dinero en el bolsillo y nada particular que me interesara en tierra, pensé que me daría una vuelta por el mar.',
          'Desde las posadas nevadas de New Bedford, la novela despliega un mundo de arponeros, mapas antiguos y amistad silenciosa antes de soltar amarras hacia aguas abiertas.',
        ],
      },
      {
        title: 'II. El capitán Ahab sobre la cubierta del Pequod',
        paragraphs: [
          'Con su pierna tallada en marfil y una cicatriz pálida recorriéndole el rostro, Ahab transforma un viaje ballenero en una cacería obsesiva contra el misterio impenetrable de la ballena blanca.',
        ],
      },
      {
        title: 'III. El océano infinito y el superviviente',
        paragraphs: [
          'Tras la tempestad final, solo Ismael flota sobre el ataúd convertido en balsa para contar la historia: la escritura permanece como único refugio frente al abismo.',
        ],
      },
    ],
    closingReflection:
      'Ninguna obsesión puede vencer al mar, pero la memoria narrada logra sobrevivir a la tormenta.',
  },
};

export function getBookEditionContent(book: BookIndexEntry): BookEditionContent {
  const found = BOOK_EDITIONS[book.id];
  if (found) return found;

  return {
    bookId: book.id,
    editionNote: 'Edición libre preparada para lectura y descarga verificada en LeerEsPensar.',
    sections: [
      {
        title: 'I. Apertura',
        paragraphs: [book.firstSip, book.hookSummary],
      },
    ],
    closingReflection: book.takeaways[0] ?? 'Lectura abierta en LeerEsPensar.',
  };
}
