import React, { useState, useEffect } from "react";
import "../../Styles/admin/employees.css";
import SideAd from "./sideAd";

const EmployeesAd = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showModal2, setShowModal2] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [rechID,setRechID]=useState("")
  const [formData, setFormData] = useState({
    emp_num_aux: "",
    emp_mail: "",
    emp_type_aux: "",
    emp_join_aux: "",
    aux_status: 1,
    contract_finish: "",
    isAdmin: false,
  });

  
  const fetchEmployees = async () => {
    try {
      const response = await fetch("http://localhost:5000/user/getemp");
      if (!response.ok) {
        throw new Error("Failed to fetch employees");
      }
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    fetchEmployees();
  }, []);
  

  const updateEmployee = async (employee) => {
    try {
      const response = await fetch(`http://localhost:5000/user/patemp/${employee.emp_num_aux}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(employee),
      });

      if (!response.ok) {
        throw new Error('Failed to update employee');
      }

      const result = await response.json();
      console.log(result.message);

      setEmployees((prevEmployees) =>
        prevEmployees.map((emp) =>
          emp.emp_num_aux === employee.emp_num_aux ? { ...emp, ...employee } : emp
        )
      );
    } catch (error) {
      console.error('Error updating employee:', error);
      alert('Error updating employee');
    }
  };
  const openAddModal = () => {
    setFormData({
      emp_num_aux: "",
      emp_mail: "",
      emp_type_aux: "",
      emp_join_aux: "",
      aux_status: 1,
      contract_finish: "",
      isAdmin: false,
    });
    setShowModal2(true);
  };
  const handleDelete = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/user/delemp/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete: ${response.statusText}`);
      }

      console.log(`Deleted user with ID: ${id}`);
      setEmployees((prevEmployees) => prevEmployees.filter(emp => emp.emp_num_aux !== id));
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const handleUpdate = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      emp_num_aux: employee.emp_num_aux,
      emp_mail: employee.emp_mail,
      emp_type_aux: employee.emp_type_aux,
      emp_join_aux: new Date(employee.emp_join_aux).toISOString().split("T")[0],
      aux_status: employee.aux_status,
    });
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };
  const handleInputChange2=(e)=>{
    setRechID(e.target.value)
  }
  const handlerecherche=async (e)=>{
    e.preventDefault()
    try{
      const response=await fetch(`http://localhost:5000/user/getemp/${rechID}`)
      if (!response.ok){throw new Error("Identifiant inExistant")}
      const data2=await response.json()
      setEmployees([data2])
    }
    catch(error)
    {alert("no employees found",error)}
  }

  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    updateEmployee(formData);
    setShowModal(false);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:5000/user/addemp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("mail et id doivenet étre uniques");
      }
      console.log(formData.aux_status)

      
      const data = await response.json();
    const newEmployeeId = data.id; 
    const newEmployee = { ...formData, id: newEmployeeId };
      console.log("New employee added:", newEmployee);

      setEmployees((prevEmployees) => [...prevEmployees, newEmployee]);

      setShowModal2(false);
      setFormData({
        emp_num_aux: "",
        emp_mail: "",
        emp_type_aux: "",
        emp_join_aux: "",
        aux_status: 1,
        contract_finish: "",
        isAdmin: false,
      });
    } catch (error) {
      console.error("mail et ID doivent étre unique", error);
      alert("mail et ID doivent étre unique");
    }
  };

  return (
    <div className="emp">
      <SideAd />
      <div className="empcontainer">
        <h1>Employees</h1>
        <div className="search">
        <button className="addbtn" onClick={() => openAddModal()}>Add</button>
        <form onSubmit={handlerecherche} onReset={fetchEmployees} >
          <input type="text" placeholder="ID employee" onChange={handleInputChange2} value={rechID} className="input"/>
          <button type="submit">Search</button>
          <button type="reset">Reset</button>
        </form>
        </div>
        <table className="tablex">
          <thead>
            <tr>
              <th>Num</th>
              <th>ID</th>
              <th>Mail</th>
              <th>Type</th>
              <th>Date of Hire</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
        </table>
        <div style={{ width: "100%" }} className="table-container">
          <table className="t2">
            <tbody>
              {employees.map((employee, index) => (
                <tr key={index}>
                  <td>{employee.id}</td>
                  <td>{employee.emp_num_aux}</td>
                  <td>{employee.emp_mail}</td>
                  <td>{employee.emp_type_aux}</td>
                  <td>{new Date(employee.emp_join_aux).toLocaleDateString("fr-FR")}</td>
                  <td>{employee.aux_status === 1 ? "Active" : "Inactive"}</td>
                  <td className="btn-container">
                    <button className="update-btn" onClick={() => handleUpdate(employee)}>
                      Update
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => {
                        const confirmDelete = window.confirm(`Are you sure you want to delete employee ${employee.emp_num_aux}?`);
                        if (confirmDelete) {
                          handleDelete(employee.emp_num_aux);
                        }
                      }}
                    >
                      Delete
                    </button>

                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal for Updating Employee */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="close-btn" onClick={() => setShowModal(false)}>X</button>
              <h2>Update employee</h2>
              <form onSubmit={handleUpdateSubmit}>
                <label>ID:</label>
                <input type="text" name="emp_num_aux" value={formData.emp_num_aux} required readOnly />

                <label>Email:</label>
                <input type="email" name="emp_mail" value={formData.emp_mail} readOnly required />

                <label>Type:</label>
                <input type="text" name="emp_type_aux" value={formData.emp_type_aux} onChange={handleInputChange} required />

                <label>Date of Hire :</label>
                <input type="date" name="emp_join_aux" value={formData.emp_join_aux} onChange={handleInputChange} required />

                <label>Status:</label>
                <select name="aux_status" value={formData.aux_status} onChange={handleInputChange}>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>

                <div className="modal-buttons">
                  <button type="submit" className="update-btn">Save</button>
                  <button type="button" className="delete-btn" onClick={() => setShowModal(false)}>Annuler</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal for Adding Employee */}
        {showModal2 && (
          <div className="modal-overlay" onClick={() => setShowModal2(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="close-btn" onClick={() => setShowModal2(false)}>X</button>
              <h2>Add employee</h2>
              <form onSubmit={handleAddSubmit}>
                <label>ID:</label>
                <input type="text" name="emp_num_aux" value={formData.emp_num_aux} onChange={handleInputChange} required />

                <label>Email:</label>
                <input type="email" name="emp_mail" value={formData.emp_mail} onChange={handleInputChange} required />

                <label>Type:</label>
                <input type="text" name="emp_type_aux" value={formData.emp_type_aux} onChange={handleInputChange} required />

                <label>Date of Hire:</label>
                <input type="date" name="emp_join_aux" value={formData.emp_join_aux} onChange={handleInputChange} required />

                <label>Contract End Date</label>
                <input type="date" name="contract_finish" value={formData.contract_finish} onChange={handleInputChange} />

                <label>Status:</label>
                <select name="aux_status" value={formData.aux_status} onChange={handleInputChange}>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>

                <label id="checkL">Admin:</label>
                <input type="checkbox" name="isAdmin" id="check" checked={formData.isAdmin} onChange={handleInputChange} />

                <div className="modal-buttons">
                  <button type="submit" className="update-btn">Save</button>
                  <button type="button" className="delete-btn" onClick={() => setShowModal2(false)}>Annuler</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeesAd;
