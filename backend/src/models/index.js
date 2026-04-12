const sequelize = require('../config/database');
const Tenant = require('./Tenant');
const TenantRegion = require('./TenantRegion');
const TenantDepartment = require('./TenantDepartment');
const TenantUser = require('./TenantUser');
const Client = require('./Client');
const ClientUser = require('./ClientUser');
const ClientDepartment = require('./ClientDepartment');
const ClientRegion = require('./ClientRegion');
const AddressDict = require('./AddressDict');

// Tenant associations
Tenant.hasMany(TenantRegion, { foreignKey: 'tenant_id', as: 'regions' });
TenantRegion.belongsTo(Tenant, { foreignKey: 'tenant_id' });

Tenant.hasMany(TenantDepartment, { foreignKey: 'tenant_id', as: 'departments' });
TenantDepartment.belongsTo(Tenant, { foreignKey: 'tenant_id' });

Tenant.hasMany(TenantUser, { foreignKey: 'tenant_id', as: 'users' });
TenantUser.belongsTo(Tenant, { foreignKey: 'tenant_id' });
TenantUser.belongsTo(TenantDepartment, { foreignKey: 'department_id', as: 'department' });

Tenant.hasMany(Client, { foreignKey: 'tenant_id', as: 'clients' });
Client.belongsTo(Tenant, { foreignKey: 'tenant_id' });

// Client associations
Client.hasMany(ClientUser, { foreignKey: 'client_id', as: 'users' });
ClientUser.belongsTo(Client, { foreignKey: 'client_id' });

Client.hasMany(ClientDepartment, { foreignKey: 'client_id', as: 'departments' });
ClientDepartment.belongsTo(Client, { foreignKey: 'client_id' });

ClientDepartment.hasMany(ClientUser, { foreignKey: 'department_id', as: 'members' });
ClientUser.belongsTo(ClientDepartment, { foreignKey: 'department_id', as: 'department' });

Client.hasMany(ClientRegion, { foreignKey: 'client_id', as: 'regions' });
ClientRegion.belongsTo(Client, { foreignKey: 'client_id' });

module.exports = {
  sequelize,
  Tenant, TenantRegion, TenantDepartment, TenantUser,
  Client, ClientUser, ClientDepartment, ClientRegion,
  AddressDict,
};
