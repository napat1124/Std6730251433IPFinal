-- Optional: the server creates this table automatically on start
CREATE TABLE IF NOT EXISTS NapatSub_Employ (
  NapatSub_ID_Employ INT AUTO_INCREMENT PRIMARY KEY,
  NapatSub_Name_Employ VARCHAR(100) NOT NULL,
  NapatSub_Position_Employ VARCHAR(100) NOT NULL,
  NapatSub_Status_Employ ENUM('Active','On Leave') NOT NULL DEFAULT 'Active',
  NapatSub_Salary_Employ DECIMAL(12,2) NOT NULL
);
