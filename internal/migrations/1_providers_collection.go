package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection := core.NewBaseCollection("providers")
		collection.Id = "pbc_providers"

		// Set rules - use @request.auth.id for filtering user's records
		collection.ListRule = strPtr(`@request.auth.id != "" && user = @request.auth.id`)
		collection.ViewRule = strPtr(`@request.auth.id != "" && user = @request.auth.id`)
		collection.CreateRule = strPtr(`@request.auth.id != ""`)
		collection.UpdateRule = strPtr(`@request.auth.id != "" && user = @request.auth.id`)
		collection.DeleteRule = strPtr(`@request.auth.id != "" && user = @request.auth.id`)

		// Add fields
		collection.Fields.Add(&core.RelationField{
			Name:          "user",
			Required:      true,
			CollectionId:  "_pb_users_auth_",
			CascadeDelete: true,
			MaxSelect:     1,
		})

		collection.Fields.Add(&core.TextField{
			Name:        "name",
			Required:    true,
			Min:         1,
			Max:         255,
			Presentable: true,
		})

		collection.Fields.Add(&core.URLField{
			Name:     "url",
			Required: true,
		})

		collection.Fields.Add(&core.SelectField{
			Name:      "currencyDefault",
			Required:  false,
			MaxSelect: 1,
			Values:    []string{"RUB", "USD", "EUR"},
		})

		collection.Fields.Add(&core.TextField{
			Name:     "notes",
			Required: false,
			Max:      1000,
		})

		// Add indexes
		collection.AddIndex("idx_providers_user", false, "user", "")

		return app.Save(collection)
	}, nil)
}

func strPtr(s string) *string {
	return &s
}
