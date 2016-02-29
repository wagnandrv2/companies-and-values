'use strict';

const pg = require('pg');
const _ = require('lodash');

const connectionString = process.env.DATABASE_URL;

const companyRowsToJson = function(companyRows){
  let companies = {};
  _.each(companyRows, function(row){
    if(!companies[row.id])
      companies[row.id] = { id: row.id, name: row.name, values: {}, locations: {} };
    if(!companies[row.id].values[row.vid])
      companies[row.id].values[row.vid] = {id: row.vid, name: row.value};
    if(!companies[row.id].locations[row.lid])
      companies[row.id].locations[row.lid] = {id: row.lid, coords: { latitude: row.latitude, longitude: row.longitude}};
  });

  return _.map(companies, function(company){
    company.locations = _.map(company.locations, function(location){ return location; });
    company.values = _.map(company.values, function(value){ return value; });
    return company;
  });
};

const getAllCompanies = function(successHandler, errorHandler){
  pg.connect(connectionString, function (err, client, done) {
    if(err) throw err;
    const queryString =
      'select c.id as id, c.name, l.id as lid, l.latitude, l.longitude, v.id as vid, v.name as value ' +
      'from company c, location l, value v '+
      'where c.id = l.company_id and c.id = v.company_id';
    client.query(queryString, [], function(err, result) {
      done();
      if(err) throw err;
      successHandler(companyRowsToJson(result.rows));
    });
  });
};

const insertValue = function(client, company_id, value, successHandler){
  const insertValueString = 'insert into value (name, company_id) values ($1, $2) returning id'
  client.query(insertValueString, [value.name, company_id], function(err, result){
    if(err) throw err;
    return successHandler && successHandler();
  });
};

const insertLocation = function(client, company_id, location, successHandler){
  const insertLocationString = 'insert into location (latitude, longitude, company_id) values ($1, $2, $3) returning id'
  client.query(insertLocationString, [location.coords.latitude, location.coords.longitude, company_id], function(err, result){
    if(err) throw err;
    return successHandler && successHandler();
  });
};

const createCompany = function(company, successHandler, errorHandler){
  pg.connect(connectionString, function (err, client, done) {
    if(err) throw err;
    const insertCompanyString = 'insert into company (name) values ($1) returning id';
    client.query(insertCompanyString, [company.name], function(err, result){
      if(err) throw err;
      const id = result.rows[0].id;

      const afterInsertion = _.after(company.values.length + company.locations.length, function(){
        done();
        successHandler && successHandler();
      });

      _.each(company.values, function(value){
        insertValue(client, id, value, afterInsertion);
      });

      _.each(company.locations, function(location){
        insertLocation(client, id, location, afterInsertion);
      });
    });
  });
};

const updateValue = function(client, value, successHandler){
    client.query('update table value set name = $1 where id = $2', [value.name, value.id], function(err, result){
      if(err) throw err;
      return successHandler && successHandler();
    });
};

const updateLocation = function(client, location, successHandler){
    client.query('update table location set latitude = $1, longitude = $2 where id = $2', [location.latitude, location.longitude, location.id], function(err, result){ if(err) throw err;
      if(err) throw err;
      return successHandler && successHandler();
    });
};

const updateCompany = function(company, successHandler){
  pg.connect(connectionString, function (err, client, done) {
    if(err) throw err;
    client.query('update table company set name = $1 where id = $2', [company.name, company.id], function(err, result){
      const afterUpdate = _.after(company.values.length + company.locations.length, function(){
        done();
        successHandler && successHandler();
      });

      _.each(company.values, function(value){
        updateValue(client, value, updateInsertion);
      });

      _.each(company.locations, function(location){
        updateLocation(client, location, updateInsertion);
      });
    });
  });
};

const deleteCompany = function(company, successHandler){
  pg.connect(connectionString, function (err, client, done) {
    if(err) throw err;
    client.query('delete from company where id = $1', [company.id], function(err, result){
      if(err) throw err;
      done();
      return successHandler && successHandler();
    });
  });
};

module.exports = {
  deleteCompany: deleteCompany,
  updateCompany: updateCompany,
  createCompany: createCompany,
  getAllCompanies: getAllCompanies
};