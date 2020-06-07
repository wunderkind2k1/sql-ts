import { Config, Database, Table, DecoratedDatabase, Enum, DecoratedEnum } from './Typings';
import * as TableTasks from './TableTasks';
import * as handlebars from 'handlebars'
import * as fs from 'fs'
import * as path from 'path'
import * as ColumnTasks from './ColumnTasks';

/**
 * Converts a Database definition to TypeScript.
 * 
 * @export
 * @param {Database} database The Database definition.
 * @param {Config} config The configuration to use.
 * @returns A TypeScript definition, optionally wrapped in a namespace.
 */
export function stringifyDatabase (database: DecoratedDatabase, config: Config): string {
  let template = fs.readFileSync(path.join(__dirname, './template.handlebars'), 'utf-8')
  if (config.template !== undefined) {
    template = fs.readFileSync(config.template, 'utf-8')
  }
  const compiler = handlebars.compile(template)
  database.tables.sort((tableA, tableB) => tableA.name.localeCompare(tableB.name));
  const grouped : {[key:string]: { tables: Table[], enums: DecoratedEnum[]}} = {}
  for (let t of database.tables) {
    if (grouped[t.schema] === undefined) {
      grouped[t.schema] = { tables: [], enums: [] }
    }
    grouped[t.schema].tables.push(t)
  }
  for (let e of database.enums) {
    if (grouped[e.schema] === undefined) {
      grouped[e.schema] = { tables: [], enums: [] }
    }
    grouped[e.schema].enums.push(e)
  }
  return compiler({
    grouped,
    config
  })
}

/**
 * Decorates the database object before sending to template compiler.
 *
 * @export
 * @param {Database} database The Database definition.
 * @param {Config} config The configuration to use.
 * @returns The decorated database definition.
 */
export function decorateDatabase(database: Database, config: Config): DecoratedDatabase {
  return {
    enums: database.enums.map(e => {
      return {
        name: e.name,
        convertedName: e.name.replace(/ /g,''),
        schema: e.schema,
        values: Object.keys(e.values).map(ee => ({
          originalKey: ee,
          convertedKey: ee.replace(/ /g, ''),
          value: e.values[ee]
        }))
      } as DecoratedEnum
    }),
    tables: database.tables.map(t => {
      return {
        ...t,
        interfaceName: TableTasks.generateInterfaceName(t.name, config),
        columns: t.columns.map(c => {
          return {
            ...c,
            propertyName: c.name.replace(/ /g,''),
            propertyType: ColumnTasks.convertType(c, t, config)
          }
        })
      }
    })  
  }
}