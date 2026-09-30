// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SchoolElection {
    address public admin;
    bool public electionActive;
    bool public electionClosed;

    enum Cargo { Ninguno, Personero, Contralor, Representante }

    struct Candidate {
        uint256 id;
        string name;
        Cargo cargo;
        uint256 voteCount;
    }

    struct Student {
        bool isRegistered;
        bool hasVoted;
        bool isCandidate;
        uint8 grade;       // RF-04: Validación de perfil
        uint8 antiquity;   // RF-04: Validación de antigüedad
    }

    // RNF-04 (Confidencialidad): "private" en Solidity solo bloquea getters
    // automaticos hacia otros contratos; NO cifra los datos ni los oculta de la
    // blockchain (cualquiera puede leer el storage crudo con eth_getStorageAt).
    // El pseudo-anonimato real depende de que el backend (RF-08) nunca publique
    // ni almacene on-chain la tabla identidad-real <-> direccion. Ademas, _candidateId
    // viaja en texto plano en el calldata de vote(): quien lea la blockchain puede
    // ver "direccion X voto por el candidato Y", por eso es critico que X no sea
    // vinculable a la identidad del estudiante por ningun otro medio.
    mapping(address => Student) private students;
    mapping(uint256 => Candidate) private candidates;
    
    uint256 public candidatesCount;
    uint8 public personeroCount;

    // RF-02: el TxID no lo genera el contrato ni este evento -- lo genera la red al
    // firmar/transmitir la transaccion. VoteCast solo permite que el backend detecte
    // el voto y capture el hash de la transaccion (receipt.transactionHash) para
    // entregarselo al estudiante como recibo.
    // RF-07 (Tablero de Auditoria): consultar un TxID y su bloque de confirmacion no
    // es algo que un smart contract pueda resolver; se hace por fuera, contra el nodo,
    // via JSON-RPC (eth_getTransactionReceipt). Es responsabilidad del backend/dApp.
    event VoteCast(address indexed voter, uint256 timestamp);
    event ElectionStarted(uint256 timestamp);
    event ElectionEnded(uint256 timestamp);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Acceso denegado: Solo el administrador");
        _;
    }

    // RF-06: Gestión del Ciclo de Vida Electoral
    modifier onlyDuringElection() {
        require(electionActive, "La eleccion no esta abierta (RF-06)");
        _;
    }

    constructor() {
        admin = msg.sender;
        electionActive = false;
        electionClosed = false;
        
        // El voto en blanco no requiere validación de estudiante (address nula)
        addCandidate("Voto en Blanco", Cargo.Ninguno, address(0)); 
    }

    // Registro en el padrón inyectando metadatos para la validación posterior
    function registerStudent(address _student, uint8 _grade, uint8 _antiquity) public onlyAdmin {
        require(!students[_student].isRegistered, "Estudiante ya registrado");
        students[_student] = Student(true, false, false, _grade, _antiquity);
    }

    // RF-04 y RF-05: Restricción de Perfil y Exclusividad
    function addCandidate(string memory _name, Cargo _cargo, address _studentAddress) public onlyAdmin {
        require(!electionActive, "No se pueden agregar candidatos durante la eleccion");

        // RN-Alcance: esta version del contrato solo cubre la eleccion de Personero.
        // Contralor y Representante quedan fuera de alcance porque requieren reglas
        // de elegibilidad de voto adicionales (grado, salon) no cubiertas por RF-04/05.
        require(
            _cargo == Cargo.Personero || _cargo == Cargo.Ninguno,
            "Fuera de alcance: esta version solo soporta candidatos a Personero (RN-Alcance)"
        );

        // Validación aplicable a candidatos reales (ignora el Voto en Blanco)
        if (_studentAddress != address(0)) {
            require(students[_studentAddress].isRegistered, "El candidato debe estar matriculado en el padron");
            
            // RF-05: Exclusividad de Postulación
            require(!students[_studentAddress].isCandidate, "El estudiante ya fue postulado a un cargo (RF-05)");
            
            // RF-04: Restricción de Perfil de Candidatura (Personero)
            if (_cargo == Cargo.Personero) {
                require(students[_studentAddress].grade == 11, "El candidato a personero debe pertenecer a grado 11 (RF-04)");
                require(students[_studentAddress].antiquity >= 3, "El candidato requiere 3 anos de antiguedad (RF-04)");
                require(personeroCount < 3, "Limite maximo de 3 candidatos a Personero alcanzado");
                personeroCount++;
            }
            
            students[_studentAddress].isCandidate = true;
        }

        candidatesCount++;
        candidates[candidatesCount] = Candidate(candidatesCount, _name, _cargo, 0);
    }

    function startElection() public onlyAdmin {
        require(!electionClosed, "La eleccion ya finalizo");
        require(personeroCount >= 2, "Se requieren al menos 2 candidatos a Personero para iniciar (RN)");
        electionActive = true;
        emit ElectionStarted(block.timestamp);
    }

    function endElection() public onlyAdmin {
        require(electionActive, "La eleccion no ha sido iniciada");
        electionActive = false;
        electionClosed = true;
        emit ElectionEnded(block.timestamp);
    }

    // RF-01: Emisión y Unicidad del Voto
    function vote(uint256 _candidateId) public onlyDuringElection {
        require(students[msg.sender].isRegistered, "Credencial no registrada en el padron");
        require(!students[msg.sender].hasVoted, "El estudiante ya emitio su voto. Prevencion de doble gasto (RF-01)");
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Candidato invalido");

        students[msg.sender].hasVoted = true;
        candidates[_candidateId].voteCount++;

        emit VoteCast(msg.sender, block.timestamp);
    }

    // RF-03: Automatización del Escrutinio
    function getCandidateVotes(uint256 _candidateId) public view returns (uint256) {
        require(electionClosed, "Lectura de resultados bloqueada hasta el cierre oficial de urnas (RF-03)");
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Candidato invalido");
        return candidates[_candidateId].voteCount;
    }
}