package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection := core.NewBaseCollection("payments")
		collection.Id = "pbc_payments"

		// Set rules - use @request.auth.id for filtering user's records
		collection.ListRule = strPtr2(`@request.auth.id != "" && user = @request.auth.id`)
		collection.ViewRule = strPtr2(`@request.auth.id != "" && user = @request.auth.id`)
		collection.CreateRule = strPtr2(`@request.auth.id != ""`)
		collection.UpdateRule = strPtr2(`@request.auth.id != "" && user = @request.auth.id`)
		collection.DeleteRule = strPtr2(`@request.auth.id != "" && user = @request.auth.id`)

		// Add fields
		collection.Fields.Add(&core.RelationField{
			Name:          "user",
			Required:      true,
			CollectionId:  "_pb_users_auth_",
			CascadeDelete: true,
			MaxSelect:     1,
		})

		collection.Fields.Add(&core.RelationField{
			Name:          "system",
			Required:      true,
			CollectionId:  "2hz5ncl8tizk5nx", // systems collection ID
			CascadeDelete: true,
			MaxSelect:     1,
		})

		collection.Fields.Add(&core.RelationField{
			Name:          "provider",
			Required:      true,
			CollectionId:  "pbc_providers",
			CascadeDelete: true,
			MaxSelect:     1,
		})

		collection.Fields.Add(&core.SelectField{
			Name:      "period",
			Required:  true,
			MaxSelect: 1,
			Values:    []string{"daily", "weekly", "monthly", "quarterly", "semiannual", "annual"},
		})

		collection.Fields.Add(&core.DateField{
			Name:     "nextPayment",
			Required: true,
		})

		collection.Fields.Add(&core.NumberField{
			Name:     "amount",
			Required: true,
			Min:      floatPtr(0),
		})

		collection.Fields.Add(&core.SelectField{
			Name:      "currency",
			Required:  true,
			MaxSelect: 1,
			Values:    []string{"RUB", "USD", "EUR"},
		})

		collection.Fields.Add(&core.TextField{
			Name:     "country",
			Required: false,
			Max:      2,
			Pattern:  `^[A-Z]{0,2}$`,
		})

		collection.Fields.Add(&core.URLField{
			Name:     "providerUrlOverride",
			Required: false,
		})

		collection.Fields.Add(&core.TextField{
			Name:     "notes",
			Required: false,
			Max:      1000,
		})

		// Add indexes
		collection.AddIndex("idx_pmt_user", false, "user", "")
		collection.AddIndex("idx_pmt_system", false, "system", "")
		collection.AddIndex("idx_pmt_provider", false, "provider", "")
		collection.AddIndex("idx_pmt_user_system", true, "user, system", "")
		collection.AddIndex("idx_pmt_next_payment", false, "nextPayment", "")

		return app.Save(collection)
	}, nil)
}

func strPtr2(s string) *string {
	return &s
}

func floatPtr(f float64) *float64 {
	return &f
}
